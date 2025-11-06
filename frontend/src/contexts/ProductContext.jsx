// frontend/src/contexts/ProductContext.jsx
import React, { createContext, useEffect, useState } from "react";
import axios from "axios";

export const ProductCtx = createContext();

export default function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [pRes, cRes] = await Promise.all([
          axios.get(API + "/api/products"),
          axios.get(API + "/api/categories"),
        ]);
        // backend returns { data: [...], meta: {...} } for lists
        const ps = pRes.data?.data ?? pRes.data ?? [];
        const cs = cRes.data?.data ?? cRes.data ?? [];
        if (!mounted) return;
        setProducts(ps);
        setCategories(cs);

        // small debug hook you can inspect in browser console
        window.__PRODUCT_CTX = { products: ps, categories: cs };
        console.log("[ProductProvider] products response:", pRes.data);
        console.log("[ProductProvider] categories response:", cRes.data);
      } catch (e) {
        console.error("ProductProvider load error", e);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  // helper to refresh lists (call after CRUD)
  async function refresh() {
    try {
      const [pRes, cRes] = await Promise.all([
        axios.get(API + "/api/products"),
        axios.get(API + "/api/categories"),
      ]);
      setProducts(pRes.data?.data ?? pRes.data ?? []);
      setCategories(cRes.data?.data ?? cRes.data ?? []);
      window.__PRODUCT_CTX = {
        products: pRes.data?.data ?? pRes.data ?? [],
        categories: cRes.data?.data ?? cRes.data ?? [],
      };
    } catch (e) {
      console.error("refresh error", e);
    }
  }

  return (
    <ProductCtx.Provider
      value={{ products, setProducts, categories, setCategories, refresh }}
    >
      {children}
    </ProductCtx.Provider>
  );
}
