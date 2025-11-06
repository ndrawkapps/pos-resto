// backend/src/routes/products.js
import express from "express";
import Product from "../models/Product.js";
const router = express.Router();

/**
 * GET /api/products?q=&page=&limit=&category=
 * returns { data: [...], meta: { total, page, limit } }
 */
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const category = (req.query.category || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);

    const filter = {};
    if (category) filter["category"] = category; // expecting category id or name depending model
    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [{ name: regex }, { description: regex }];
    }

    const total = await Product.countDocuments(filter);
    const items = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ data: items, meta: { total, page, limit } });
  } catch (err) {
    console.error("GET /api/products error:", err);
    res.status(500).json({ error: "server error" });
  }
});

/**
 * GET /api/products/:id
 * return product detail
 */
router.get("/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: "product not found" });
    res.json(p);
  } catch (err) {
    console.error("GET /api/products/:id err:", err);
    if (err.name === "CastError")
      return res.status(400).json({ error: "invalid id" });
    res.status(500).json({ error: "server error" });
  }
});

/**
 * POST /api/products
 * create product (admin)
 */
router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    // minimal validation
    if (!payload.name) return res.status(400).json({ error: "name required" });

    const p = new Product({
      name: payload.name,
      description: payload.description || "",
      price: payload.price || 0,
      category: payload.category || null,
      image: payload.image || null,
      available:
        payload.available !== undefined ? Boolean(payload.available) : true,
    });
    await p.save();
    res.status(201).json(p);
  } catch (err) {
    console.error("create product err:", err);
    res.status(400).json({ error: err.message || "bad request" });
  }
});

/**
 * PUT /api/products/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const payload = req.body || {};
    const updated = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) return res.status(404).json({ error: "product not found" });
    res.json(updated);
  } catch (err) {
    console.error("update product err:", err);
    if (err.name === "CastError")
      return res.status(400).json({ error: "invalid id" });
    res.status(400).json({ error: err.message || "bad request" });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id).lean();
    if (!p) return res.status(404).json({ error: "product not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("delete product err:", err);
    if (err.name === "CastError")
      return res.status(400).json({ error: "invalid id" });
    res.status(500).json({ error: "server error" });
  }
});

export default router;
