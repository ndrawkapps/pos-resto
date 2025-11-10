// backend/src/routes/orders.js
import express from "express";
import Order from "../models/Order.js";
import CashRegister from "../models/CashRegister.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helper: normalize paymentMethod strings that count as cash
function paymentIsCash(pm) {
  if (!pm) return false;
  const s = String(pm).toLowerCase().trim();
  const cashVariants = [
    "cash",
    "tunai",
    "cod",
    "cash-on-delivery",
    "cash_on_delivery",
  ];
  return cashVariants.includes(s);
}

// GET list (keperluan History)
router.get("/", verifyToken, async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(
      1,
      Math.min(500, parseInt(req.query.limit || "50", 10))
    );
    const orderType = req.query.orderType?.toString();

    const filters = {};
    if (orderType) filters.orderType = orderType;

    if (q) {
      const isObjectIdLike = /^[0-9a-fA-F]{24}$/.test(q);
      if (isObjectIdLike) filters._id = q;
      else filters["items.name"] = { $regex: q, $options: "i" };
    }

    const total = await Order.countDocuments(filters);
    const data = await Order.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    return res.json({ data, total, page, limit });
  } catch (err) {
    console.error("GET /api/orders err:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET detail
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(order);
  } catch (err) {
    console.error("GET /api/orders/:id err:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/orders (checkout)
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      items,
      total: totalBody,
      orderType,
      paymentReceived,
      paymentMethod,
    } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    // compute total if not provided
    const computedTotal = items.reduce(
      (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0),
      0
    );
    const total = Number(totalBody ?? computedTotal);

    // create order
    const order = await Order.create({
      items,
      total,
      orderType: orderType || "dine in",
      createdBy: (req.user && (req.user.id || req.user._id)) || null,
      paymentReceived:
        paymentReceived != null ? Number(paymentReceived) : undefined,
      paymentMethod: paymentMethod || null,
    });

    // Determine user id robustly
    const userId =
      (req.user && (req.user.id || req.user._id || req.user)) || null;
    if (!userId) {
      // shouldn't happen if verifyToken works, but safe-guard
      return res.status(400).json({ message: "User info missing in token" });
    }

    // find today's cash register for this user
    const key = todayKey();
    const cashRec = await CashRegister.findOne({ user: userId, date: key });

    if (!cashRec) {
      // prefer to prevent silent create — require opening shift
      return res.status(400).json({
        message:
          "Opening modal belum diinput hari ini. Silakan input modal sebelum transaksi.",
      });
    }

    let change = 0;
    let newBalance =
      cashRec.balance != null
        ? Number(cashRec.balance)
        : Number(cashRec.openingAmount || 0);

    const affectsCash = paymentIsCash(paymentMethod);

    if (paymentReceived != null && !isNaN(Number(paymentReceived))) {
      const paid = Number(paymentReceived);
      change = Math.max(0, paid - total);

      if (affectsCash) {
        // netCash yang benar-benar masuk ke kas = min(paid, total)
        const netCash = Math.max(0, Math.min(paid, total));

        const updated = await CashRegister.findOneAndUpdate(
          { user: userId, date: key },
          { $inc: { balance: netCash } },
          { new: true }
        );

        if (updated && updated.balance != null) newBalance = updated.balance;
      } else {
        // cashless -> don't alter balance
        newBalance = cashRec.balance;
      }
    } else {
      // no paymentReceived info (platform handled) -> do not change balance
      newBalance = cashRec.balance;
    }

    return res.status(201).json({ success: true, order, change, newBalance });
  } catch (err) {
    console.error("POST /api/orders err:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
