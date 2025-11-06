// frontend/src/pages/Users.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Users management (Admin)
 * - List users
 * - Create user
 * - Edit user
 * - Delete user
 *
 * Note: role mapping displays Indonesian labels but sends backend-friendly values.
 */

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  // gunakan 'cashier' sebagai value supaya tidak terjadi enum error seperti sebelumnya ('kasir' bukan diterima)
  { label: "Kasir", value: "kasir" },
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({
    _id: null,
    username: "",
    password: "",
    role: "cashier",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/users`);
      // support responses like { data: [...] } or [...] directly
      const data = res.data?.data ?? res.data ?? [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("load users err:", err);
      alert("Gagal memuat daftar user: " + (err?.message ?? "error"));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setIsEdit(false);
    setForm({ _id: null, username: "", password: "", role: "cashier" });
    setShowModal(true);
  }

  function openEdit(u) {
    setIsEdit(true);
    setForm({
      _id: u._id ?? u.id ?? null,
      username: u.username || "",
      password: "", // kosongkan password saat edit; backend harus meng-handle jika kosong -> tidak ubah
      role: u.role || "cashier",
    });
    setShowModal(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        // prepare payload; if password empty, omit it
        const payload = { username: form.username, role: form.role };
        if (form.password && form.password.trim())
          payload.password = form.password;
        const res = await axios.put(`${API}/api/users/${form._id}`, payload);
        // update local list
        setUsers((prev) =>
          prev.map((p) =>
            String(p._id) === String(form._id)
              ? res.data ?? res.data?.data ?? res.data
              : p
          )
        );
      } else {
        const payload = {
          username: form.username,
          password: form.password,
          role: form.role,
        };
        const res = await axios.post(`${API}/api/users`, payload);
        // add to list (put newest on top)
        const created = res.data ?? res.data?.data ?? res.data;
        setUsers((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      console.error("save user err:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Gagal menyimpan user";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    const ok = window.confirm("Hapus user ini? Aksi tidak bisa dibatalkan.");
    if (!ok) return;
    try {
      await axios.delete(`${API}/api/users/${id}`);
      setUsers((prev) => prev.filter((u) => String(u._id) !== String(id)));
    } catch (err) {
      console.error("delete user err:", err);
      const msg =
        err?.response?.data?.error || err?.message || "Gagal menghapus user";
      alert(msg);
    }
  }

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Manajemen User</h5>
        <div>
          <button
            className="btn btn-sm btn-primary"
            onClick={openCreate}
            title="Tambah user baru"
          >
            <i className="fa fa-plus me-2" /> Tambah User
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-3 text-muted">Memuat...</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th style={{ width: 140, textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-3">
                        Belum ada user.
                      </td>
                    </tr>
                  )}

                  {users.map((u) => (
                    <tr key={u._id ?? u.id}>
                      <td style={{ minWidth: 180 }}>{u.username}</td>
                      <td>
                        {String(u.role || "").toLowerCase() === "admin"
                          ? "Admin"
                          : "Kasir"}
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            title="Edit"
                            onClick={() => openEdit(u)}
                          >
                            <i className="fa fa-edit" />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Hapus"
                            onClick={() => handleDelete(u._id ?? u.id)}
                          >
                            <i className="fa fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          onClick={() => setShowModal(false)}
          role="dialog"
        >
          <div
            className="modal-dialog modal-md modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {isEdit ? "Edit User" : "Tambah User"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setShowModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      required
                      className="form-control"
                      placeholder="username"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Password{" "}
                      {isEdit ? (
                        <small className="text-muted">
                          {" "}
                          (kosong = tidak diubah)
                        </small>
                      ) : null}
                    </label>
                    <input
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      type="password"
                      className="form-control"
                      placeholder={
                        isEdit ? "Biarkan kosong untuk tetap" : "Password"
                      }
                      {...(!isEdit ? { required: true } : {})}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <div className="form-text">
                      Mengirim value: <code>{form.role}</code>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving
                      ? "Menyimpan..."
                      : isEdit
                      ? "Simpan Perubahan"
                      : "Buat User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
