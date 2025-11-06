// backend/src/routes/orders.js
import express from "express";
import Order from "../models/Order.js";
const router = express.Router();

/**
 * GET /api/orders?q=&orderType=&page=&limit=
 * returns { data: [...], meta: { total, page, limit } }
 */
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const orderType = (req.query.orderType || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);

    const filter = {};
    if (orderType) filter.orderType = orderType;

    if (q) {
      const regex = new RegExp(q, "i");
      const or = [{ "items.name": regex }];
      if (!Number.isNaN(Number(q))) or.push({ total: Number(q) });
      const dt = Date.parse(q);
      if (!Number.isNaN(dt)) {
        const start = new Date(dt);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dt);
        end.setHours(23, 59, 59, 999);
        or.push({ createdAt: { $gte: start, $lte: end } });
      }
      filter.$or = or;
    }

    const total = await Order.countDocuments(filter);
    const items = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ data: items, meta: { total, page, limit } });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    res.status(500).json({ error: "server error" });
  }
});

/**
 * GET /api/orders/:id
 * return detail order
 */
router.get("/:id", async (req, res) => {
  try {
    const o = await Order.findById(req.params.id).lean();
    if (!o) return res.status(404).json({ error: "order not found" });
    res.json(o);
  } catch (err) {
    console.error("GET /api/orders/:id err:", err);
    if (err.name === "CastError")
      return res.status(400).json({ error: "invalid id" });
    res.status(500).json({ error: "server error" });
  }
});

/**
 * POST /api/orders
 * create order
 */
router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    let total = payload.total;
    if (total === undefined) {
      total = items.reduce(
        (s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0),
        0
      );
    }

    const allowed = ["dine in", "takeaway", "grabfood", "shopeefood", "gofood"];
    const ot =
      payload.orderType && allowed.includes(payload.orderType)
        ? payload.orderType
        : "dine in";

    const o = new Order({
      items,
      total,
      orderType: ot,
      status: payload.status || "paid",
    });
    await o.save();

    // return created order
    res.status(201).json(o);
  } catch (err) {
    console.error("create order err:", err);
    res.status(400).json({ error: err.message || "bad request" });
  }
});

/**
 * DELETE /api/orders/:id
 * delete an order (history)
 */
router.delete("/:id", async (req, res) => {
  try {
    const o = await Order.findByIdAndDelete(req.params.id).lean();
    if (!o) return res.status(404).json({ error: "order not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/orders/:id err:", err);
    if (err.name === "CastError")
      return res.status(400).json({ error: "invalid id" });
    res.status(500).json({ error: "server error" });
  }
});

export default router;
