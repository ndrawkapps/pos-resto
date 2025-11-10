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
import analyticsRoutes from "./routes/analytics.js";
import User from "./models/User.js";
import cashregistersRoutes from "./routes/cashregisters.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// serve uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// mount API routes
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/users", usersRoutes); // <-- ensure users route mounted
app.use("/api/analytics", analyticsRoutes);
app.use("/api/cashregisters", cashregistersRoutes);

// health & root
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

const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/pos_resto";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // seed default admin if not exists
    try {
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
    } catch (seedErr) {
      console.warn("Seed admin error:", seedErr);
    }

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });
