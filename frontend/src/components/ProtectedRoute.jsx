// frontend/src/components/ProtectedRoute.jsx
// frontend/src/contexts/AuthContext.jsx
import React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx"; // pastikan path benar

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // atau return a spinner component
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && Array.isArray(roles) && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
