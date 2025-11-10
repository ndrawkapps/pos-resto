// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./contexts/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import OpenShiftModal from "./components/OpenShiftModal.jsx";

import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Beranda from "./pages/Beranda.jsx";
import Cashier from "./pages/Cashier.jsx";
import Products from "./pages/Products.jsx";
import Categories from "./pages/Categories.jsx";
import History from "./pages/History.jsx";
import Users from "./pages/Users.jsx";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

export default function App() {
  const { user, token, logout } = useAuth(); // token might be from context
  const [showOpenModal, setShowOpenModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkOpen() {
      if (!user) return setShowOpenModal(false);
      try {
        const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
        const res = await axios.get(`${API}/api/cashregisters/today`, {
          headers: {
            Authorization: token
              ? `Bearer ${token}`
              : localStorage.getItem("token")
              ? `Bearer ${localStorage.getItem("token")}`
              : undefined,
          },
        });
        if (!mounted) return;
        if (res.data?.exists === false) setShowOpenModal(true);
        else setShowOpenModal(false);
      } catch (err) {
        console.warn(
          "checkOpen err",
          err?.response?.data || err.message || err
        );
        if (err?.response?.status === 401) logout();
      }
    }
    checkOpen();
    return () => {
      mounted = false;
    };
  }, [user, token, logout]);

  return (
    <BrowserRouter>
      {user && (
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
            >
              <span className="navbar-toggler-icon" />
            </button>

            <div className="collapse navbar-collapse" id="mainNav">
              <ul className="navbar-nav ms-auto">
                {user.role === "admin" && (
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

                {user.role === "admin" && (
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

                <li className="nav-item">
                  <Link className="nav-link" to="/history">
                    Riwayat
                  </Link>
                </li>

                <li className="nav-item">
                  <button
                    onClick={logout}
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
      )}

      <main
        className="main-content container-fluid my-4 px-3"
        style={{ paddingTop: 72 }}
      >
        <div className="container-lg">
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <Login />}
            />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cashier"
              element={
                <ProtectedRoute>
                  <Cashier />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />

            <Route
              path="/products"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beranda"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Beranda />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </main>

      <OpenShiftModal
        show={showOpenModal}
        token={token || localStorage.getItem("token")}
        onClose={(success) => setShowOpenModal(false)}
      />
    </BrowserRouter>
  );
}
