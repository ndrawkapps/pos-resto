import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ProductCtx } from "../contexts/ProductContext";
import IconButton from "../components/IconButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faSearch,
  faTimes,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Categories() {
  const { categories, refresh } = useContext(ProductCtx);
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => setList(categories), [categories]);
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQ(searchQ.trim().toLowerCase()),
      250
    );
    return () => clearTimeout(t);
  }, [searchQ]);

  const visible = useMemo(() => {
    if (!debouncedQ) return list;
    return list.filter((c) =>
      (c.name || "").toLowerCase().includes(debouncedQ)
    );
  }, [list, debouncedQ]);

  async function add(e) {
    e.preventDefault();
    try {
      await axios.post(API + "/api/categories", { name });
      setName("");
      await refresh();
    } catch (err) {
      console.error(err);
      alert("Gagal tambah kategori");
    }
  }

  async function remove(id) {
    if (!confirm("Hapus kategori?")) return;
    try {
      await axios.delete(API + "/api/categories/" + id);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Gagal hapus");
    }
  }

  return (
    <div className="row gx-3">
      {/* LEFT: add form */}
      <div className="col-12 col-md-4 mb-3">
        <div className="card sticky-top" style={{ top: 84 }}>
          <div className="card-body">
            <h5 className="mb-3">Tambah Kategori</h5>
            <form onSubmit={add}>
              <input
                className="form-control mb-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kategori"
                required
              />
              <div className="d-grid">
                <button className="btn btn-primary" type="submit">
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT: list + search */}
      <div className="col-12 col-md-8 mb-3">
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Daftar Kategori</h5>

              <div className="input-group w-50 d-none d-md-flex">
                <span className="input-group-text">
                  <FontAwesomeIcon icon={faSearch} />
                </span>
                <input
                  className="form-control"
                  placeholder="Cari kategori..."
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
                  placeholder="Cari kategori..."
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

            <ul className="list-group">
              {visible.map((c) => (
                <li
                  key={c._id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <span>{c.name}</span>
                  <IconButton
                    variant="danger"
                    size="sm"
                    onClick={() => remove(c._id)}
                    icon={<FontAwesomeIcon icon={faTrash} />}
                  />
                </li>
              ))}
              {visible.length === 0 && (
                <li className="list-group-item">
                  <small className="text-muted">Tidak ada kategori.</small>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
