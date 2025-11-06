import React, { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function History() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null); // detail order for modal
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/orders`, {
        params: { q: q || "", page, limit },
      });
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error("load orders err:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function viewDetail(id) {
    try {
      const res = await axios.get(`${API}/api/orders/${id}`);
      setSelected(res.data);
      setModalOpen(true);
    } catch (err) {
      console.error("view detail err:", err);
      alert(
        "Gagal mengambil detail pesanan: " +
          (err?.response?.data?.error || err.message)
      );
    }
  }

  async function handleDelete(id) {
    if (!confirm("Hapus riwayat transaksi ini?")) return;
    try {
      await axios.delete(`${API}/api/orders/${id}`);
      // refresh list (tetap di halaman yg sama)
      await load();
      // close modal if the deleted was open
      if (selected && String(selected._id) === String(id)) {
        setModalOpen(false);
        setSelected(null);
      }
    } catch (err) {
      console.error("delete order err:", err);
      alert("Gagal menghapus: " + (err?.response?.data?.error || err.message));
    }
  }

  function fmt(n) {
    try {
      return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
    } catch {
      return String(n);
    }
  }

  function escapeHtml(s) {
    return String(s || "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  function printReceipt(orderData) {
    const o = orderData;
    if (!o) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return alert("Popup blocked — izinkan popup untuk mencetak.");
    const created = o.createdAt ? new Date(o.createdAt) : new Date();
    const itemsHtml = (o.items || [])
      .map(
        (
          it
        ) => `<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <div style="max-width:200px;word-wrap:break-word">${escapeHtml(
            it.name || "-"
          )} x${it.qty}</div>
          <div style="margin-left:8px">${fmt(
            (it.price || 0) * (it.qty || 0)
          )}</div>
        </div>`
      )
      .join("");

    const html = `
      <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: monospace; font-size: 12px; width: 280px; margin: 8px; }
          h2 { text-align:center; margin:6px 0; font-size:14px }
          .muted { color:#666; font-size:11px; }
          .divider { border-top:1px dashed #000; margin:8px 0; }
          .right { text-align:right; }
        </style>
      </head>
      <body>
        <h2>POS Resto</h2>
        <div class="muted">Tipe: ${escapeHtml(o.orderType || "-")}</div>
        <div class="muted">Tanggal: ${created.toLocaleString()}</div>
        <div class="divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between;font-weight:bold;">
          <div>Total</div><div>${fmt(o.total)}</div>
        </div>
        <div style="margin-top:12px; font-size:11px; text-align:center;">
          Terima kasih!<br/>Selamat menikmati makanan Anda.
        </div>
      </body>
      </html>
    `;
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch (e) {
        console.warn("print err", e);
      }
    }, 300);
  }

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Riwayat Transaksi</h4>
        <div className="d-flex gap-2 align-items-center">
          <input
            className="form-control form-control-sm"
            placeholder="Cari (produk / total / tanggal)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                load();
              }
            }}
            style={{ minWidth: 220 }}
          />
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => {
              setPage(1);
              load();
            }}
          >
            <i className="fa fa-search" /> Cari
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 140 }}>Tanggal</th>
              <th>Items</th>
              <th style={{ width: 120 }}>Total</th>
              <th style={{ width: 120 }}>Tipe</th>
              <th style={{ width: 140 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  Memuat...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-muted">
                  Tidak ada riwayat
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id}>
                  <td style={{ fontSize: 13 }}>
                    {new Date(o.createdAt).toLocaleString()}
                    <div className="text-muted small">{o.status || "-"}</div>
                  </td>
                  <td style={{ maxWidth: 420 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {(o.items || [])
                        .slice(0, 2)
                        .map((it) => it.name)
                        .join(", ")}
                      {(o.items || []).length > 2
                        ? ` (+${(o.items || []).length - 2} item)`
                        : ""}
                    </div>
                    <small className="text-muted">
                      {(o.items || [])
                        .map((it) => `${it.qty}×${it.name}`)
                        .slice(0, 3)
                        .join(" • ")}
                    </small>
                  </td>
                  <td>Rp {fmt(o.total)}</td>
                  <td style={{ textTransform: "capitalize" }}>
                    {o.orderType || "-"}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        title="Lihat detail"
                        onClick={() => viewDetail(o._id)}
                      >
                        <i className="fa fa-eye" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        title="Cetak"
                        onClick={() => printReceipt(o)}
                      >
                        <i className="fa fa-print" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        title="Hapus"
                        onClick={() => handleDelete(o._id)}
                      >
                        <i className="fa fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Simple pagination controls */}
      <div className="d-flex justify-content-between align-items-center mt-2">
        <div className="text-muted small">Halaman {page}</div>
        <div>
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => {
              if (page > 1) {
                setPage((p) => p - 1);
              }
            }}
          >
            Prev
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setPage((p) => p + 1);
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal detail */}
      {modalOpen && selected && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          role="dialog"
          onClick={() => {
            setModalOpen(false);
            setSelected(null);
          }}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detail Pesanan</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setModalOpen(false);
                    setSelected(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <strong>Tanggal:</strong>{" "}
                  {new Date(selected.createdAt).toLocaleString()}
                </div>
                <div className="mb-2">
                  <strong>Tipe:</strong> {selected.orderType}
                </div>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th style={{ width: 100 }}>Harga</th>
                        <th style={{ width: 100 }}>Qty</th>
                        <th style={{ width: 120 }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.items || []).map((it, idx) => (
                        <tr key={it.product ? it.product : idx}>
                          <td style={{ maxWidth: 300 }}>{it.name}</td>
                          <td>Rp {fmt(it.price)}</td>
                          <td>{it.qty}</td>
                          <td>Rp {fmt((it.price || 0) * (it.qty || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="d-flex justify-content-end mt-3">
                  <div className="me-4">
                    <div className="small text-muted">Total</div>
                    <div style={{ fontWeight: 700 }}>
                      Rp {fmt(selected.total)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => printReceipt(selected)}
                >
                  <i className="fa fa-print" /> Print
                </button>
                <button
                  className="btn btn-outline-danger"
                  onClick={() => {
                    handleDelete(selected._id);
                  }}
                >
                  <i className="fa fa-trash" /> Hapus
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setModalOpen(false);
                    setSelected(null);
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
