// frontend/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx"; // <-- pastikan path ini sesuai

/**
 * ProtectedRoute
 * - children: component yang dilindungi
 * - roles: optional array of allowed roles, e.g. ['admin', 'cashier']
 *
 * Usage:
 * <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Jika masih loading (mis. sedang mengecek token dari localStorage / verifying),
  // jangan render apapun (atau render spinner). Ini mencegah flash redirect.
  if (loading) return null; // atau return <Spinner /> jika kamu punya spinner component

  // Jika tidak login -> redirect ke /login dan simpan lokasi asal agar bisa redirect balik
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Jika ada roles spesifik dan user.role tidak termasuk -> redirect ke home (atau 403 page)
  if (roles && Array.isArray(roles) && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Semua ok -> render children
  return children;
}
