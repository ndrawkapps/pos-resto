// frontend/src/pages/Beranda.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const COLORS = ["#007bff", "#28a745", "#ffc107", "#dc3545", "#6f42c1"];

export default function Beranda() {
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyRaw, setMonthlyRaw] = useState([]);
  const [byCashier, setByCashier] = useState([]);
  const [timeOfDay, setTimeOfDay] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // today's cash register balance
  const [todayBalance, setTodayBalance] = useState(null);

  // ref + size detection to avoid Recharts width(-1)/height(-1)
  const wrapperRef = useRef(null);
  const [hasSize, setHasSize] = useState(false);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        const ok = cr.width > 0 && cr.height > 0;
        setHasSize(ok);
      }
    });
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoaded(false);
    try {
      const token = localStorage.getItem("token");
      const [s, tp, m, bc, tod] = await Promise.all([
        axios.get(`${API}/api/analytics/summary`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }),
        axios.get(`${API}/api/analytics/top-products?limit=6`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }),
        axios.get(`${API}/api/analytics/monthly`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }),
        axios.get(`${API}/api/analytics/by-cashier`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }),
        axios.get(`${API}/api/analytics/time-of-day`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }),
      ]);
      setSummary(s.data ?? null);
      setTopProducts(tp.data?.data ?? tp.data ?? []);
      setMonthlyRaw(m.data?.data ?? m.data ?? []);
      setByCashier(bc.data?.data ?? bc.data ?? []);
      setTimeOfDay(tod.data?.data ?? tod.data ?? []);
    } catch (err) {
      console.error("Gagal load analytics:", err);
      setSummary(null);
      setTopProducts([]);
      setMonthlyRaw([]);
      setByCashier([]);
      setTimeOfDay([]);
    } finally {
      setLoaded(true);
      // always try to fetch today's balance after analytics load
      fetchTodayBalance();
    }
  }

  async function fetchTodayBalance() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/cashregisters/today`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.data?.exists && res.data.record) {
        // prefer explicit balance field, fallback to openingAmount
        setTodayBalance(
          res.data.record.balance ?? res.data.record.openingAmount ?? 0
        );
      } else {
        setTodayBalance(null);
      }
    } catch (err) {
      console.warn(
        "fetchTodayBalance err:",
        err?.response?.data || err.message || err
      );
      setTodayBalance(null);
    }
  }

  const monthly = useMemo(() => buildMonthlySeries(monthlyRaw), [monthlyRaw]);

  function buildMonthlySeries(rows) {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      months.push({
        key,
        name: d.toLocaleString("default", { month: "short", year: "numeric" }),
        revenue: 0,
        orders: 0,
      });
    }
    (rows || []).forEach((r) => {
      const y = r._id?.year ?? r.year ?? new Date().getFullYear();
      const m = r._id?.month ?? r.month ?? new Date().getMonth() + 1;
      const key = `${y}-${m}`;
      const found = months.find((mm) => mm.key === key);
      if (found) {
        found.revenue = Number(r.revenue ?? r.total ?? 0);
        found.orders = Number(r.orders ?? r.count ?? 0);
      }
    });
    return months;
  }

  function fmt(n) {
    try {
      return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
    } catch {
      return String(n || 0);
    }
  }

  const pieData = (arr) =>
    (arr || []).map((r, i) => ({
      name: r._id ?? r.bucket ?? r.cashierName ?? r.name ?? `item${i + 1}`,
      value: Number(r.revenue ?? r.totalQty ?? r.orders ?? r.value ?? 0),
    }));

  return (
    <div className="mt-4" ref={wrapperRef}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="fw-semibold text-primary mb-0">📊 Analitik Penjualan</h4>
        <div style={{ textAlign: "right" }}>
          <div className="text-muted" style={{ fontSize: 12 }}>
            Sisa modal hari ini
          </div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {todayBalance == null ? (
              <small className="text-muted">—</small>
            ) : (
              `Rp ${fmt(todayBalance)}`
            )}
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card p-3 shadow-sm">
            <small className="text-muted">Pemesanan Hari Ini</small>
            <h5>{summary?.today?.orders ?? 0}</h5>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-3 shadow-sm">
            <small className="text-muted">Pendapatan Hari Ini</small>
            <h5>Rp {fmt(summary?.today?.revenue)}</h5>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-3 shadow-sm">
            <small className="text-muted">Pemesanan Bulan Ini</small>
            <h5>{summary?.month?.orders ?? 0}</h5>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-3 shadow-sm">
            <small className="text-muted">Pendapatan Bulan Ini</small>
            <h5>Rp {fmt(summary?.month?.revenue)}</h5>
          </div>
        </div>
      </div>

      <div className="card p-3 mb-4 shadow-sm">
        <h6 className="fw-semibold mb-3">Top Selling Products</h6>
        <ul className="list-group list-group-flush small">
          {topProducts && topProducts.length ? (
            topProducts.map((p, idx) => (
              <li
                key={p._id ?? p.name ?? idx}
                className="list-group-item d-flex justify-content-between"
              >
                <span>{p.name}</span>
                <span className="text-muted">
                  {(p.totalQty ?? p.qty ?? 0) + "x"} — Rp {fmt(p.revenue ?? 0)}
                </span>
              </li>
            ))
          ) : (
            <li className="list-group-item text-muted">
              Tidak ada data penjualan
            </li>
          )}
        </ul>
      </div>

      <div className="row g-3">
        {/* Revenue per Month */}
        <div className="col-12 col-lg-6">
          <div className="card p-3 shadow-sm">
            <h6 className="fw-semibold mb-2">Pendapatan per Bulan</h6>
            <div className="chart-container">
              {loaded && hasSize ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip
                      formatter={(v) =>
                        `Rp ${v?.toLocaleString?.("id-ID") ?? v}`
                      }
                    />
                    <Bar dataKey="revenue" fill="#007bff" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                  Memuat chart...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orders per Month */}
        <div className="col-12 col-lg-6">
          <div className="card p-3 shadow-sm">
            <h6 className="fw-semibold mb-2">Jumlah Order per Bulan</h6>
            <div className="chart-container">
              {loaded && hasSize ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="#28a745" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                  Memuat chart...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* By Cashier */}
        <div className="col-12 col-lg-6">
          <div className="card p-3 shadow-sm">
            <h6 className="fw-semibold mb-2">Pendapatan per Kasir</h6>
            <div className="chart-container">
              {loaded && hasSize ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(byCashier || []).map((r) => ({
                      name: r.cashierName ?? r._id ?? "Kasir",
                      revenue: Number(r.revenue ?? 0),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip
                      formatter={(v) =>
                        `Rp ${v?.toLocaleString?.("id-ID") ?? v}`
                      }
                    />
                    <Bar dataKey="revenue" fill="#ffc107" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                  Memuat chart...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Time of Day */}
        <div className="col-12 col-lg-6">
          <div className="card p-3 shadow-sm">
            <h6 className="fw-semibold mb-2">Penjualan Berdasarkan Waktu</h6>
            <div className="chart-container">
              {loaded && hasSize ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData(timeOfDay)}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {pieData(timeOfDay).map((entry, idx) => (
                        <Cell
                          key={entry.name ?? idx}
                          fill={COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                  Memuat chart...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
