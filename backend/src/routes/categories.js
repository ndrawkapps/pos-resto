// backend/src/routes/categories.js
import express from "express";
import Category from "../models/Category.js";
const router = express.Router();

// GET all (or search q optional)
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const filter = q ? { name: new RegExp(q, "i") } : {};
    const items = await Category.find(filter).sort({ name: 1 }).lean();
    res.json({ data: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const c = new Category({ name: req.body.name });
    await c.save();
    res.status(201).json(c);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "bad request" });
  }
});

router.delete("/:id", async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
