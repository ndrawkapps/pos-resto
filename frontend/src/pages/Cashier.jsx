// frontend/src/pages/Cashier.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ProductCtx } from "../contexts/ProductContext.jsx";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSearch,
  faTimes,
  faReceipt,
  faTrashAlt,
  faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ORDER_TYPES = ["dine in", "takeaway", "grabfood", "shopeefood", "gofood"];

export default function Cashier() {
  const ctx = useContext(ProductCtx) || {};
  const products = ctx.products ?? [];
  const categories = ctx.categories ?? [];
  const refresh = ctx.refresh ?? (() => Promise.resolve());

  const [activeCat, setActiveCat] = useState("all");
  const [cart, setCart] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [orderType, setOrderType] = useState("dine in");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [lastOrder, setLastOrder] = useState(null);

  // payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash"); // cash or qris
  const [paymentError, setPaymentError] = useState(null);

  // today's cash register balance
  const [todayBalance, setTodayBalance] = useState(null);

  useEffect(() => {
    if (activeCat === "all" || activeCat === "uncat") return;
    const found = categories.find((c) => String(c._id) === String(activeCat));
    if (!found && categories.length > 0) setActiveCat("all");
  }, [categories, activeCat]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQ(searchQ.trim().toLowerCase()),
      250
    );
    return () => clearTimeout(t);
  }, [searchQ]);

  // helpers
  function getCategoryId(cat) {
    if (!cat) return null;
    if (typeof cat === "object") return String(cat._id ?? cat.id ?? "");
    return String(cat);
  }
  function getCategoryName(catOrId, categories) {
    if (!catOrId || !categories) return "";
    if (typeof catOrId === "object") {
      return (
        catOrId.name ||
        categories.find((x) => String(x._id) === String(catOrId._id))?.name ||
        ""
      );
    }
    const c = categories.find((x) => String(x._id) === String(catOrId));
    return c ? c.name : "";
  }
  function fmt(n) {
    try {
      return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
    } catch {
      return String(n);
    }
  }

  // products filtering
  function productsFor(catId) {
    if (catId === "all") return products ?? [];
    if (catId === "uncat") return (products ?? []).filter((p) => !p.category);
    return (products ?? []).filter((p) => {
      const pid = getCategoryId(p.category);
      return String(pid) === String(catId);
    });
  }

  const visibleProducts = useMemo(() => {
    const q = debouncedQ;
    return productsFor(activeCat).filter((p) => {
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (getCategoryName(p.category, categories) || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [products, categories, activeCat, debouncedQ]);

  // cart actions
  function addToCart(p) {
    const existing = cart.find((i) => i.product === p._id);
    if (existing) {
      setCart((prev) =>
        prev.map((i) => (i.product === p._id ? { ...i, qty: i.qty + 1 } : i))
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          product: p._id,
          name: p.name,
          price: p.price,
          qty: 1,
          image: p.image || null,
        },
      ]);
    }
  }
  function changeQty(idx, val) {
    setCart((prev) => {
      const c = [...prev];
      c[idx].qty = Math.max(1, Number(val) || 1);
      return c;
    });
  }
  function deleteItem(idx) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  // fetch today's balance
  async function fetchTodayBalance() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/cashregisters/today`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.data?.exists && res.data.record) {
        setTodayBalance(
          res.data.record.balance ?? res.data.record.openingAmount ?? 0
        );
      } else {
        setTodayBalance(null);
      }
    } catch (err) {
      console.warn(
        "fetchTodayBalance err:",
        err?.response?.data || err.message || err
      );
      setTodayBalance(null);
    }
  }

  useEffect(() => {
    fetchTodayBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // open payment modal
  async function openPaymentModal() {
    if (!cart.length) return alert("Keranjang kosong");
    setPaymentReceived("");
    setPaymentError(null);
    const platform = ["grabfood", "shopeefood", "gofood"].includes(orderType);
    setPaymentMethod(platform ? "qris" : "cash");
    setShowPayment(true);
  }

  // compute total
  const totalAmount = cart.reduce(
    (s, i) => s + (i.price || 0) * (i.qty || 0),
    0
  );

  // submit & checkout
  async function submitPaymentAndCheckout() {
    setPaymentError(null);
    const paidRaw = paymentReceived === "" ? null : Number(paymentReceived);

    if (paymentMethod === "cash") {
      if (paidRaw == null || isNaN(paidRaw) || paidRaw < 0) {
        setPaymentError("Masukkan jumlah uang tunai yang valid.");
        return;
      }
    } else {
      if (paidRaw != null && (isNaN(paidRaw) || paidRaw < 0)) {
        setPaymentError("Jumlah pembayaran tidak valid.");
        return;
      }
    }

    if (paymentMethod === "cash" && paidRaw < totalAmount) {
      const ok = window.confirm(
        "Jumlah yang diterima kurang dari total. Lanjutkan sebagai pembayaran parsial?"
      );
      if (!ok) return;
    }

    try {
      const payload = {
        items: cart,
        total: totalAmount,
        orderType,
        paymentReceived: paidRaw,
        paymentMethod,
      };

      const token = localStorage.getItem("token");
      const r = await axios.post(API + "/api/orders", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      // store full response so receipt and balance info available
      setLastOrder(r.data);

      const change = r.data.change ?? 0;
      const newBalance = r.data.newBalance ?? null;

      setModalStatus("success");
      setModalMessage(`Transaksi berhasil. Kembalian: Rp ${fmt(change)}.`);
      setModalOpen(true);
      setCart([]);
      setShowPayment(false);

      if (newBalance != null) setTodayBalance(newBalance);
      else fetchTodayBalance();

      if (typeof refresh === "function") {
        try {
          await refresh();
        } catch (e) {
          console.warn("refresh after checkout err", e);
        }
      }
    } catch (err) {
      console.error(
        "checkout error:",
        err?.response?.data || err.message || err
      );
      setPaymentError(
        err?.response?.data?.message || err.message || "Transaksi gagal."
      );
    }
  }

  // print receipt — accepts full response (has .order/.change) or plain order object
  function printReceipt(responseOrOrder) {
    const resp = responseOrOrder?.order
      ? responseOrOrder
      : { order: responseOrOrder };
    const orderData = resp.order || {};
    const created = orderData?.createdAt
      ? new Date(orderData.createdAt)
      : new Date();
    const items = orderData?.items || [];
    const total =
      orderData?.total ??
      items.reduce(
        (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0),
        0
      );
    const paymentReceivedVal =
      orderData?.paymentReceived ?? resp.paymentReceived ?? null;
    const paymentMethodVal =
      orderData?.paymentMethod ?? resp.paymentMethod ?? null;
    const change =
      resp.change ??
      (paymentReceivedVal != null
        ? Math.max(0, Number(paymentReceivedVal) - total)
        : 0);

    const itemsHtml = (items || [])
      .map((it) => {
        const name = String(it.name || it.product || "");
        const qty = Number(it.qty || 0);
        const unit = fmt(it.price || 0);
        const sub = fmt((Number(it.price) || 0) * qty);
        return `<tr>
          <td style="padding:6px 0;vertical-align:top">${escapeHtml(name)}</td>
          <td style="padding:6px 0;text-align:right;vertical-align:top">${qty}</td>
          <td style="padding:6px 0;text-align:right;vertical-align:top">${unit}</td>
          <td style="padding:6px 0;text-align:right;vertical-align:top">${sub}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>Receipt</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body { font-family: monospace; font-size:14px; width:320px; margin:8px; color:#000; }
            h2 { text-align:center; margin:6px 0; font-size:16px; }
            .muted { color:#666; font-size:12px; }
            .divider { border-top:1px dashed #000; margin:8px 0; }
            table { width:100%; border-collapse: collapse; font-size:13px; }
            th { text-align:left; font-size:13px; padding-bottom:6px; }
          </style>
        </head>
        <body>
          <h2>POS Resto</h2>
          <div class="muted">Tipe: ${escapeHtml(
            orderData?.orderType || ""
          )}</div>
          <div class="muted">Tanggal: ${created.toLocaleString()}</div>
          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:right">Qty</th>
                <th style="text-align:right">Harga</th>
                <th style="text-align:right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <table style="width:100%;font-weight:bold">
            <tr>
              <td>Total</td>
              <td style="text-align:right">Rp ${fmt(total)}</td>
            </tr>
            <tr style="font-weight:normal">
              <td>Metode</td>
              <td style="text-align:right">${escapeHtml(
                paymentMethodVal || "-"
              )}</td>
            </tr>
            <tr style="font-weight:normal">
              <td>Diterima</td>
              <td style="text-align:right">${
                paymentReceivedVal != null
                  ? `Rp ${fmt(paymentReceivedVal)}`
                  : "-"
              }</td>
            </tr>
            <tr>
              <td>Kembalian</td>
              <td style="text-align:right">Rp ${fmt(change)}</td>
            </tr>
          </table>

          <div class="divider"></div>
          <div style="text-align:center;font-size:12px">Terima kasih — Selamat datang kembali!</div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return alert("Popup diblokir — izinkan popup untuk mencetak.");
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch (e) {
        console.warn(e);
      }
    }, 300);
  }

  function escapeHtml(text) {
    if (text == null) return "";
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Category tabs component
  function CategoryTabs() {
    return (
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeCat === "all" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveCat("all")}
          >
            Semua
          </button>
        </li>
        {categories.map((c) => (
          <li className="nav-item" key={c._id}>
            <button
              className={`nav-link ${
                String(activeCat) === String(c._id) ? "active" : ""
              }`}
              type="button"
              onClick={() => setActiveCat(c._id)}
            >
              {c.name}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  // Render
  return (
    <>
      <div className="row gx-3">
        <div className="col-12 col-md-8 mb-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Produk</h5>
                <div className="input-group w-50 d-none d-md-flex">
                  <span className="input-group-text">
                    <FontAwesomeIcon icon={faSearch} />
                  </span>
                  <input
                    className="form-control"
                    placeholder="Cari produk..."
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                  />
                  {searchQ && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setSearchQ("")}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-3 d-md-none">
                <div className="input-group">
                  <span className="input-group-text">
                    <FontAwesomeIcon icon={faSearch} />
                  </span>
                  <input
                    className="form-control"
                    placeholder="Cari..."
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                  />
                </div>
              </div>

              <CategoryTabs />

              <div className="row g-2">
                {visibleProducts.length === 0 && (
                  <div className="col-12">
                    <div className="alert alert-light mb-0">
                      Tidak ada produk.
                    </div>
                  </div>
                )}
                {visibleProducts.map((p) => (
                  <div key={p._id} className="col-6 col-sm-4 col-md-3">
                    <div className="card h-100">
                      <div className="card-body d-flex flex-column">
                        {p.image ? (
                          <img
                            src={`${API}/uploads/${p.image}`}
                            alt={p.name}
                            style={{
                              width: "100%",
                              height: 120,
                              objectFit: "cover",
                              borderRadius: 6,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: 120,
                              background: "#f0f0f0",
                              borderRadius: 6,
                            }}
                          />
                        )}
                        <h6 className="card-title mt-2 mb-1">{p.name}</h6>
                        <small className="text-muted">
                          {getCategoryName(p.category, categories)}
                        </small>
                        <p className="mb-2">Rp {fmt(p.price)}</p>
                        <div className="mt-auto">
                          <button
                            className="btn btn-secondary btn-sm w-100 d-flex justify-content-center align-items-center"
                            onClick={() => addToCart(p)}
                          >
                            <FontAwesomeIcon icon={faPlus} className="me-2" />{" "}
                            Tambah
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card sticky-top" style={{ top: 88 }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <h5 className="mb-2">Keranjang</h5>
                <div className="text-end">
                  <div style={{ fontSize: 12 }} className="text-muted">
                    Sisa modal
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {todayBalance == null ? (
                      <small className="text-muted">—</small>
                    ) : (
                      `Rp ${fmt(todayBalance)}`
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="btn-group w-100" role="group">
                  {ORDER_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`btn ${
                        orderType === t
                          ? "btn-primary"
                          : "btn-outline-secondary"
                      } btn-sm`}
                      onClick={() => setOrderType(t)}
                    >
                      {t === "dine in" ? "Dine In" : t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th style={{ width: 90 }}>Qty</th>
                      <th style={{ width: 110 }}>Subtotal</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((c, idx) => (
                      <tr key={c.product + "-" + idx}>
                        <td style={{ minWidth: 140 }}>
                          <div
                            className="d-flex align-items-center"
                            style={{ gap: 8 }}
                          >
                            {c.image ? (
                              <img
                                src={`${API}/uploads/${c.image}`}
                                alt={c.name}
                                style={{
                                  width: 48,
                                  height: 48,
                                  objectFit: "cover",
                                  borderRadius: 6,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 48,
                                  height: 48,
                                  background: "#f0f0f0",
                                  borderRadius: 6,
                                }}
                              />
                            )}
                            <div>
                              <div style={{ fontSize: 14 }}>{c.name}</div>
                              <small className="text-muted">
                                Rp {fmt(c.price)}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td style={{ width: 90 }}>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={c.qty}
                            min="1"
                            onChange={(e) => changeQty(idx, e.target.value)}
                          />
                        </td>
                        <td style={{ width: 110 }}>
                          Rp {fmt(c.price * c.qty)}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Hapus item"
                            onClick={() => deleteItem(idx)}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <small className="text-muted">Keranjang kosong</small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between mt-3">
                <strong>Total:</strong>
                <strong>Rp {fmt(totalAmount)}</strong>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-outline-secondary flex-grow-1"
                  onClick={() => setCart([])}
                  disabled={cart.length === 0}
                >
                  <FontAwesomeIcon icon={faTrashAlt} className="me-2" />{" "}
                  Bersihkan
                </button>
                <button
                  className="btn btn-primary flex-grow-1"
                  onClick={openPaymentModal}
                  disabled={cart.length === 0}
                >
                  <FontAwesomeIcon icon={faReceipt} className="me-2" /> Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div
          className="modal-backdrop-custom"
          onClick={() => setShowPayment(false)}
        />
      )}
      <div
        className={`modal show d-block ${showPayment ? "" : "d-none"}`}
        tabIndex="-1"
        role="dialog"
        onClick={() => setShowPayment(false)}
      >
        <div
          className="modal-dialog modal-sm modal-dialog-centered"
          role="document"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Pembayaran</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowPayment(false)}
              />
            </div>
            <div className="modal-body">
              <div className="mb-2">
                Total: <strong>Rp {fmt(totalAmount)}</strong>
              </div>

              <div className="mb-3">
                <label className="form-label">Metode Pembayaran</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="qris">QRIS / Cashless</option>
                </select>
                <small className="text-muted">
                  Jika memilih QRIS, sisa modal tidak akan berubah.
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label">Jumlah yang diterima (Rp)</label>
                <input
                  type="number"
                  className="form-control"
                  value={paymentReceived}
                  onChange={(e) => setPaymentReceived(e.target.value)}
                  autoFocus
                />
                <small className="text-muted">
                  Kosongkan jika transaksi cashless/QRIS yang tidak mencatat
                  tunai.
                </small>
              </div>

              {paymentError && (
                <div className="alert alert-danger">{paymentError}</div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowPayment(false)}
              >
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={submitPaymentAndCheckout}
              >
                <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                Bayar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result modal */}
      {modalOpen && (
        <>
          <div
            className="modal-backdrop-custom"
            onClick={() => setModalOpen(false)}
          />
          <div
            className="modal show d-block modal-custom"
            tabIndex="-1"
            role="dialog"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="modal-dialog modal-sm modal-dialog-centered"
              role="document"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {modalStatus === "success" ? "Sukses" : "Error"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setModalOpen(false)}
                  />
                </div>
                <div className="modal-body">
                  <p>{modalMessage}</p>

                  {modalStatus === "success" && lastOrder && (
                    <div>
                      <small className="text-muted">
                        Total: Rp{" "}
                        {fmt(lastOrder.order?.total ?? lastOrder.total ?? 0)}
                      </small>
                      <div
                        style={{
                          maxHeight: 160,
                          overflow: "auto",
                          marginTop: 8,
                        }}
                      >
                        {(lastOrder.order?.items ?? lastOrder.items ?? []).map(
                          (it, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6,
                              }}
                            >
                              <div style={{ maxWidth: 180 }}>
                                {it.name} x{it.qty}
                              </div>
                              <div>
                                Rp {fmt((it.price || 0) * (it.qty || 0))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  {modalStatus === "success" && lastOrder && (
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => printReceipt(lastOrder)}
                    >
                      <FontAwesomeIcon icon={faReceipt} className="me-2" />
                      Print Receipt
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => setModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
