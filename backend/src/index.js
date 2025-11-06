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

// serve uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Routes
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true, ts: new Date() }));

const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/pos_resto";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Cek apakah admin default sudah ada
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

    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });
