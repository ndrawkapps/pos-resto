// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Beranda from "./pages/Beranda"; // analytics (admin only)
import Cashier from "./pages/Cashier";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import History from "./pages/History";
import Users from "./pages/Users";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js"; // <-- penting agar navbar toggler bekerja

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // cek login dari localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

      // inside handleLogin:
      const res = await fetch(`${API}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "Login gagal");
        throw new Error(txt || "Login gagal");
      }
      const data = await res.json();
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setUsername("");
      setPassword("");
    } catch (err) {
      alert("Login gagal: " + (err?.message || err));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  // jika belum login -> tampilkan form login (tidak merender Router)
  if (!user) {
    return (
      <div className="container mt-5">
        <h3 className="mb-4">Login POS Resto</h3>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">
            Login
          </button>
        </form>
      </div>
    );
  }

  // jika sudah login -> render aplikasi
  return (
    <BrowserRouter>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            POS Resto
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav ms-auto">
              {/* Beranda hanya untuk admin */}
              {user?.role === "admin" && (
                <li className="nav-item">
                  <Link className="nav-link" to="/beranda">
                    Beranda
                  </Link>
                </li>
              )}

              <li className="nav-item">
                <Link className="nav-link" to="/cashier">
                  Kasir
                </Link>
              </li>

              {/* Menu admin */}
              {user?.role === "admin" && (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/products">
                      Produk
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/categories">
                      Kategori
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/users">
                      User
                    </Link>
                  </li>
                </>
              )}

              {/* Menu umum */}
              <li className="nav-item">
                <Link className="nav-link" to="/history">
                  Riwayat
                </Link>
              </li>

              <li className="nav-item">
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-light ms-3"
                  type="button"
                >
                  Logout ({user.username})
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main
        className="main-content container-fluid my-4 px-3"
        style={{ paddingTop: 8 }}
      >
        <div className="container-lg">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cashier" element={<Cashier />} />
            <Route path="/history" element={<History />} />

            {/* Admin only routes */}
            {user?.role === "admin" && (
              <>
                <Route path="/products" element={<Products />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/users" element={<Users />} />
                <Route path="/beranda" element={<Beranda />} />
              </>
            )}

            {/* Redirect non-admin away from admin routes */}
            {user?.role !== "admin" && (
              <>
                <Route path="/products" element={<Navigate to="/" replace />} />
                <Route
                  path="/categories"
                  element={<Navigate to="/" replace />}
                />
                <Route path="/users" element={<Navigate to="/" replace />} />
                <Route path="/beranda" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </div>
      </main>
    </BrowserRouter>
  );
}
