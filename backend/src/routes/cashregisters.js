// backend/src/routes/cashregisters.js
import express from "express";
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

// GET /api/cashregisters/today
router.get("/today", verifyToken, async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId)
      return res.status(400).json({ message: "Invalid token payload" });

    const key = todayKey();
    const rec = await CashRegister.findOne({ user: userId, date: key });
    if (!rec) return res.json({ exists: false });
    return res.json({ exists: true, record: rec });
  } catch (err) {
    console.error("GET /cashregisters/today err:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/cashregisters/open
router.post("/open", verifyToken, async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId)
      return res.status(400).json({ message: "Invalid token payload" });

    const key = todayKey();
    const { openingAmount, note } = req.body || {};
    if (openingAmount == null || isNaN(Number(openingAmount))) {
      return res
        .status(400)
        .json({ message: "openingAmount required and must be a number" });
    }

    const existing = await CashRegister.findOne({ user: userId, date: key });
    if (existing) {
      return res
        .status(409)
        .json({
          message: "Opening already recorded for today",
          record: existing,
        });
    }

    const newRec = await CashRegister.create({
      user: userId,
      openingAmount: Number(openingAmount),
      note: note || "",
      date: key,
      createdBy: userId,
    });

    return res.status(201).json({ success: true, record: newRec });
  } catch (err) {
    console.error("POST /cashregisters/open err:", err);
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Opening already recorded for today" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
