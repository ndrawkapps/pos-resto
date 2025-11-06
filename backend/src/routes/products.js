// backend/src/routes/products.js
import express from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import multer from "multer";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

const router = express.Router();

// uploads directory relative to project root (index.js serves /uploads statically)
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage: unique filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// safe unlink
function tryUnlink(fp) {
  try {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch (e) {
    console.warn("unlink err", e?.message || e);
  }
}

// GET all
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().populate("category");
    res.json(products);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch products", details: err.message });
  }
});

// GET one
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "invalid id" });
    const p = await Product.findById(id).populate("category");
    if (!p) return res.status(404).json({ error: "not found" });
    res.json(p);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch product", details: err.message });
  }
});

/**
 * CREATE (multipart/form-data)
 * fields: name, price, category (optional), available (optional)
 * file: image (optional)
 */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, price, category = null, available = "true" } = req.body;

    if (!name || price === undefined) {
      if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
      return res.status(400).json({ error: "name and price are required" });
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum)) {
      if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
      return res.status(400).json({ error: "price must be a number" });
    }

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
        return res.status(400).json({ error: "invalid category id" });
      }
      const catExists = await Category.findById(category).select("_id");
      if (!catExists) {
        if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
        return res.status(400).json({ error: "category not found" });
      }
    }

    const imageFilename = req.file ? req.file.filename : null;

    const p = new Product({
      name,
      price: priceNum,
      category,
      image: imageFilename,
      available: available === "false" || available === false ? false : true,
    });

    await p.save();
    await p.populate("category");
    res.status(201).json(p);
  } catch (err) {
    if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
    res
      .status(500)
      .json({ error: "Failed to create product", details: err.message });
  }
});

/**
 * UPDATE (multipart/form-data)
 * - if an "image" file is provided, it replaces the old image (old file deleted)
 * - if no file provided, existing image remains
 */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
      return res.status(400).json({ error: "invalid id" });
    }

    const allowed = ["name", "price", "category", "available"];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }

    if (update.price !== undefined) {
      const n = Number(update.price);
      if (Number.isNaN(n)) {
        if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
        return res.status(400).json({ error: "price must be a number" });
      }
      update.price = n;
    }

    if (update.category) {
      if (!mongoose.Types.ObjectId.isValid(update.category)) {
        if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
        return res.status(400).json({ error: "invalid category id" });
      }
      const catExists = await Category.findById(update.category).select("_id");
      if (!catExists) {
        if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
        return res.status(400).json({ error: "category not found" });
      }
    }

    if (update.available !== undefined) {
      update.available =
        update.available === "false" || update.available === false
          ? false
          : true;
    }

    if (req.file) update.image = req.file.filename;

    const prev = await Product.findById(id);
    if (!prev) {
      if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
      return res.status(404).json({ error: "not found" });
    }

    const p = await Product.findByIdAndUpdate(id, update, {
      new: true,
    }).populate("category");

    // delete old image if replaced
    if (req.file && prev.image) {
      const oldPath = path.join(uploadsDir, prev.image);
      if (fs.existsSync(oldPath) && prev.image !== req.file.filename) {
        tryUnlink(oldPath);
      }
    }

    res.json(p);
  } catch (err) {
    if (req.file) tryUnlink(path.join(uploadsDir, req.file.filename));
    res
      .status(500)
      .json({ error: "Failed to update product", details: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "invalid id" });

    const p = await Product.findByIdAndDelete(id);
    if (!p) return res.status(404).json({ error: "not found" });

    if (p.image) {
      const fp = path.join(uploadsDir, p.image);
      if (fs.existsSync(fp)) tryUnlink(fp);
    }

    res.json({ ok: true, deleted: p });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete product", details: err.message });
  }
});

export default router;
