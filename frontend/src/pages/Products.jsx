import React, { useContext, useEffect, useState } from "react";
import { ProductCtx } from "../contexts/ProductContext.jsx";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Products() {
  const ctx = useContext(ProductCtx) || {};
  const products = ctx.products ?? [];
  const categories = ctx.categories ?? [];
  const refresh = ctx.refresh ?? (() => Promise.resolve());

  const [loading, setLoading] = useState(false);

  // modal / form state
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false); // false = create, true = edit
  const [form, setForm] = useState({
    _id: null,
    name: "",
    price: "",
    category: "",
    image: null, // File object when selected
    imagePreview: "", // dataURL or existing filename URL
    available: true,
    existingImageName: null, // filename on server for edit mode
  });

  useEffect(() => {
    if (!form.category && categories.length > 0 && !editMode) {
      setField("category", categories[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  function fmt(n) {
    try {
      return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
    } catch {
      return String(n);
    }
  }

  function getCategoryName(cat) {
    if (!cat) return "—";
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

  // ---------- form helpers ----------
  function openCreate() {
    setEditMode(false);
    setForm({
      _id: null,
      name: "",
      price: "",
      category: categories[0]?._id || "",
      image: null,
      imagePreview: "",
      available: true,
      existingImageName: null,
    });
    setShowForm(true);
  }

  function openEdit(p) {
    setEditMode(true);
    const preview = p.image ? `${API}/uploads/${p.image}` : "";
    setForm({
      _id: p._id || p.id || null,
      name: p.name || "",
      price: p.price ?? "",
      category: p.category
        ? typeof p.category === "object"
          ? p.category._id
          : p.category
        : "",
      image: null,
      imagePreview: preview,
      available: p.available ?? true,
      existingImageName: p.image ?? null,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setSaving(false);
  }

  function setField(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    if (!f) {
      setField("image", null);
      setField("imagePreview", "");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setField("imagePreview", ev.target.result);
    };
    reader.readAsDataURL(f);
    setField("image", f);
  }

  async function handleSave(e) {
    e && e.preventDefault();
    if (!form.name || form.name.trim() === "") {
      alert("Nama produk wajib diisi");
      return;
    }
    if (form.price === "" || Number.isNaN(Number(form.price))) {
      alert("Harga harus diisi dan berupa angka");
      return;
    }

    try {
      setSaving(true);

      if (form.image) {
        const fd = new FormData();
        fd.append("image", form.image);
        fd.append("name", form.name);
        fd.append("price", String(Number(form.price)));
        if (form.category) fd.append("category", form.category);
        fd.append("available", String(!!form.available));

        if (editMode && form._id) {
          await axios.put(`${API}/api/products/${form._id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          await axios.post(`${API}/api/products`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      } else {
        const payload = {
          name: form.name,
          price: Number(form.price),
          category: form.category || null,
          available: !!form.available,
        };
        if (editMode && form._id) {
          await axios.put(`${API}/api/products/${form._id}`, payload);
        } else {
          await axios.post(`${API}/api/products`, payload);
        }
      }

      await refresh();
      closeForm();
    } catch (err) {
      console.error("save product err:", err);
      const msg = err?.response?.data?.error || err.message || "Unknown";
      alert("Gagal simpan: " + msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Produk</h4>
        <div>
          <button className="btn btn-sm btn-primary me-2" onClick={openCreate}>
            <i className="fa fa-plus me-1" /> Tambah
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
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
                onClick={() => openEdit(p)}
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

      {/* Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={closeForm}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
            }}
          />

          <form
            onSubmit={handleSave}
            style={{
              position: "relative",
              zIndex: 1101,
              width: 760,
              maxWidth: "95%",
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
              padding: 20,
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="m-0">
                {editMode ? "Edit Produk" : "Tambah Produk"}
              </h5>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary me-2"
                  onClick={closeForm}
                >
                  Batal
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Nama</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Harga (Rp)</label>
                <input
                  className="form-control"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Kategori</label>
                <select
                  className="form-select"
                  value={form.category || ""}
                  onChange={(e) => setField("category", e.target.value)}
                >
                  <option value="">-- pilih kategori --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Gambar (opsional)</label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div className="form-text">
                  Pilih file gambar maksimal 5MB. Jika kosong saat edit, gambar
                  lama akan tetap digunakan.
                </div>

                {form.imagePreview ? (
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={form.imagePreview}
                      alt="preview"
                      style={{
                        maxWidth: "100%",
                        maxHeight: 180,
                        borderRadius: 6,
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="col-12 d-flex gap-3 align-items-center">
                <div className="form-check">
                  <input
                    id="availableSwitch"
                    className="form-check-input"
                    type="checkbox"
                    checked={!!form.available}
                    onChange={(e) => setField("available", e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="availableSwitch">
                    Tersedia
                  </label>
                </div>
                <small className="text-muted">
                  Field tersedia akan disimpan ke database.
                </small>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
