// backend/src/index.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

import productsRoutes from "./routes/products.js";
import categoriesRoutes from "./routes/categories.js";
import ordersRoutes from "./routes/orders.js";
import usersRoutes from "./routes/users.js";
import User from "./models/User.js";
import analyticsRoutes from "./routes/analytics.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// __dirname helper for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Serve uploaded files (API asset) ---
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// --- Serve frontend build when exists ---
// Adjust 'frontendBuildPath' if your frontend build output is placed elsewhere
const frontendBuildPath = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendBuildPath));

// --- API Routes (keep these before the SPA catch-all) ---
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health & root
app.get("/health", (req, res) =>
  res.status(200).json({
    ok: true,
    env: process.env.NODE_ENV || "not-set",
    ts: new Date().toISOString(),
  })
);

app.get("/", (req, res) => {
  res.send(`
    <html><body style="font-family: sans-serif;">
      <h1>pos-resto backend</h1>
      <p>✅ Connected & running</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p><a href="/health">Health Check</a></p>
    </body></html>
  `);
});

// --- SPA fallback: jika request bukan untuk /api atau /uploads, return index.html ---
// Important: place this AFTER all API and static middleware
app.get("*", (req, res, next) => {
  // jika ini request ke API atau ke uploads, lanjut (biarkan 404 API normal atau middleware lain)
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
    return next();
  }

  // kirimkan index.html dari frontend build jika ada
  const indexHtml = path.join(frontendBuildPath, "index.html");
  return res.sendFile(indexHtml, function (err) {
    if (err) {
      // jika index.html tidak ditemukan, lempar 404 agar masalah terlihat
      console.error("Failed to send index.html for SPA fallback:", err);
      return res.status(404).send("Not found");
    }
  });
});

// --- DB + server start ---
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/pos_resto";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // create default admin jika belum ada
    const adminExists = await User.findOne({ username: "admin" });
    if (!adminExists) {
      const hashed = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "Admin Utama",
        username: "admin",
        password: hashed,
        role: "admin",
      });
      console.log(
        "✅ Default admin created: username=admin, password=admin123"
      );
    }

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });
