import React, { useContext, useState } from "react";
import { ProductCtx } from "../contexts/ProductContext.jsx";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Products() {
  const ctx = useContext(ProductCtx) || {};
  const products = ctx.products ?? [];
  const categories = ctx.categories ?? [];
  const refresh = ctx.refresh ?? (() => Promise.resolve());

  const [loading, setLoading] = useState(false);

  function fmt(n) {
    try {
      return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
    } catch {
      return String(n);
    }
  }

  function getCategoryName(cat) {
    if (!cat) return "—";
    // cat might be Object or id string
    if (typeof cat === "object") return cat.name || "—";
    const found = categories.find((c) => String(c._id) === String(cat));
    return found ? found.name : "—";
  }

  async function handleDelete(productId) {
    if (!confirm("Hapus produk ini?")) return;
    try {
      setLoading(true);
      await axios.delete(`${API}/api/products/${productId}`);
      await refresh();
    } catch (err) {
      console.error("hapus produk err:", err);
      alert("Gagal hapus: " + (err?.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Produk</h4>
        <div>
          <button
            className="btn btn-sm btn-primary me-2"
            // keep UI: but real "Tambah" action not changed
            onClick={() =>
              alert("Fungsi Tambah belum diimplementasikan di UI ini")
            }
          >
            <i className="fa fa-plus me-1" /> Tambah
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              // call refresh and handle promise so button doesn't error
              try {
                refresh();
              } catch (e) {
                console.warn("refresh err", e);
              }
            }}
          >
            <i className="fa fa-sync" />
          </button>
        </div>
      </div>

      <div className="list-group">
        {products.length === 0 && (
          <div className="text-muted">Tidak ada produk.</div>
        )}
        {products.map((p) => (
          <div
            key={p._id || p.id}
            className="list-group-item d-flex align-items-center justify-content-between"
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {p.image ? (
                <img
                  src={`${API}/uploads/${p.image}`}
                  alt={p.name}
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: 6,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    background: "#f0f0f0",
                    borderRadius: 6,
                  }}
                />
              )}
              <div>
                <div className="fw-semibold">{p.name}</div>
                <div className="small text-muted">
                  {getCategoryName(p.category)}
                </div>
                <div className="small text-muted">Rp {fmt(p.price)}</div>
              </div>
            </div>

            <div>
              <button
                className="btn btn-sm btn-outline-primary me-2"
                title="Edit"
                onClick={() =>
                  alert("Edit produk: fitur UI belum diimplementasikan")
                }
              >
                <i className="fa fa-edit" />
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleDelete(p._id || p.id)}
                disabled={loading}
                title="Hapus"
              >
                <i className="fa fa-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
