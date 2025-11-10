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
} from "@fortawesome/free-solid-svg-icons";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ORDER_TYPES = ["dine in", "takeaway", "grabfood", "shopeefood", "gofood"];

// Helper: normalize category value (can be object or id string)
function getCategoryId(cat) {
  if (!cat) return null;
  if (typeof cat === "object") return String(cat._id ?? cat.id ?? "");
  return String(cat);
}

// Helper to get category name from id or object
function getCategoryName(catOrId, categories) {
  if (!catOrId || !categories) return "";
  // if passed an object
  if (typeof catOrId === "object") {
    return (
      catOrId.name ||
      categories.find((x) => String(x._id) === String(catOrId._id))?.name ||
      ""
    );
  }
  // otherwise treat as id string
  const c = categories.find((x) => String(x._id) === String(catOrId));
  return c ? c.name : "";
}

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

  // ensure activeCat stays valid when categories load/change
  useEffect(() => {
    if (activeCat === "all" || activeCat === "uncat") return;
    // if current activeCat not found in categories, reset to "all"
    const found = categories.find((c) => String(c._id) === String(activeCat));
    if (!found && categories.length > 0) {
      setActiveCat("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQ(searchQ.trim().toLowerCase()),
      250
    );
    return () => clearTimeout(t);
  }, [searchQ]);

  // products filter locally — switching tabs DOES NOT re-fetch
  function productsFor(catId) {
    if (catId === "all") return products ?? [];
    if (catId === "uncat") return (products ?? []).filter((p) => !p.category);
    // normalize product.category to id and compare
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

  function fmt(n) {
    try {
      return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
    } catch {
      return String(n);
    }
  }

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

  function printReceipt(orderData) {
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return alert("Popup diblokir — izinkan popup untuk mencetak.");
    const created = orderData?.createdAt
      ? new Date(orderData.createdAt)
      : new Date();

    const itemsHtml = (orderData.items || [])
      .map((it) => {
        const qty = Number(it.qty || 0);
        const unit = Number(it.price || 0);
        const lineTotal = qty * unit;
        return `<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <div style="max-width:140px;word-wrap:break-word">
          <div style="font-weight:600">${String(it.name)}</div>
          <div style="font-size:11px;color:#555">x${qty} × Rp ${fmt(unit)}</div>
        </div>
        <div style="margin-left:8px">Rp ${fmt(lineTotal)}</div>
      </div>`;
      })
      .join("");

    const html = `
    <html><head><title>Receipt</title>
    <style>
      body { font-family: monospace; font-size:12px; width:280px; margin:8px; }
      h2 { text-align:center; margin:6px 0; font-size:14px }
      .divider { border-top:1px dashed #000; margin:8px 0; }
      .muted { color: #666; font-size: 12px; }
    </style>
    </head><body>
    <h2>POS Resto</h2>
    <div class="muted">Tipe: ${orderData.orderType || ""}</div>
    <div class="muted">Tanggal: ${created.toLocaleString()}</div>
    <div class="divider"></div>
    ${itemsHtml}
    <div class="divider"></div>
    <div style="display:flex;justify-content:space-between;font-weight:bold;">
      <div>Total</div><div>Rp ${fmt(orderData.total)}</div>
    </div>
    </body></html>
  `;
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

  async function checkout() {
    if (!cart.length) return alert("Keranjang kosong");
    try {
      const payload = {
        items: cart,
        total: cart.reduce(
          (s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0),
          0
        ),
        orderType,
      };
      const r = await axios.post(API + "/api/orders", payload);
      setLastOrder(r.data);
      setModalStatus("success");
      setModalMessage("Transaksi berhasil.");
      setModalOpen(true);
      setCart([]);
      if (typeof refresh === "function") {
        try {
          await refresh();
        } catch (e) {
          console.warn("refresh after checkout err", e);
        }
      }
    } catch (err) {
      console.error("checkout error:", err);
      setModalStatus("error");
      setModalMessage(
        err?.response?.data?.error || err.message || "Transaksi gagal."
      );
      setModalOpen(true);
    }
  }

  // Category tabs (bootstrap)
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
        {/* <li className="nav-item">
          <button
            className={`nav-link ${activeCat === "uncat" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveCat("uncat")}
          >
            Tanpa Kategori
          </button>
        </li> */}
      </ul>
    );
  }

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
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
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
              <h5 className="mb-2">Keranjang</h5>

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
                      <th>Qty</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((c, idx) => (
                      <tr key={c.product}>
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
                        <td style={{ width: 90 }}>Rp {fmt(c.price * c.qty)}</td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={3}>
                          <small className="text-muted">Keranjang kosong</small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between mt-3">
                <strong>Total:</strong>
                <strong>
                  Rp{" "}
                  {fmt(
                    cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0)
                  )}
                </strong>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-outline-secondary flex-grow-1"
                  onClick={() => setCart([])}
                  disabled={cart.length === 0}
                >
                  <FontAwesomeIcon icon={faTrashAlt} className="me-2" />
                  Bersihkan
                </button>
                <button
                  className="btn btn-primary flex-grow-1"
                  onClick={checkout}
                  disabled={cart.length === 0}
                >
                  <FontAwesomeIcon icon={faReceipt} className="me-2" />
                  Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal overlay */}
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
                        Total: Rp {fmt(lastOrder.total)}
                      </small>
                      <div
                        style={{
                          maxHeight: 160,
                          overflow: "auto",
                          marginTop: 8,
                        }}
                      >
                        {(lastOrder.items || []).map((it, idx) => (
                          <div
                            key={it.product ? it.product : idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}
                          >
                            <div style={{ maxWidth: 180 }}>
                              {it.name} x{it.qty}
                            </div>
                            <div>Rp {fmt((it.price || 0) * (it.qty || 0))}</div>
                          </div>
                        ))}
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
