import React, { createContext, useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const ProductCtx = createContext({
  products: [],
  categories: [],
  loading: false,
  refresh: async () => {},
});

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Helper: normalize categories response to always be an array
  function normalizeCategoriesResp(respData) {
    if (!respData) return [];
    if (Array.isArray(respData)) return respData;
    if (Array.isArray(respData.data)) return respData.data;
    return [];
  }

  // fetch both products and categories; used on mount and after changes
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        axios.get(`${API}/api/products`),
        axios.get(`${API}/api/categories`),
      ]);

      // Products: usually array in pRes.data
      const p = Array.isArray(pRes.data)
        ? pRes.data
        : Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : [];
      setProducts(p);

      const c = normalizeCategoriesResp(cRes.data);
      setCategories(c);
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // refresh function for consumers
  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  return (
    <ProductCtx.Provider value={{ products, categories, loading, refresh }}>
      {children}
    </ProductCtx.Provider>
  );
}

// Add default export so existing main.jsx that imports default won't break
export default ProductProvider;
