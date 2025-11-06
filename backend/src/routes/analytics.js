// backend/src/routes/analytics.js
import express from "express";
import Order from "../models/Order.js";
const router = express.Router();

// helper timezone-aware startOfDay / startOfMonth
function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// GET /api/analytics/summary
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const startToday = startOfDay(now);
    const endToday = endOfDay(now);

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // today
    const todayAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startToday, $lte: endToday },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } },
      },
    ]);

    // month
    const monthAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startMonth, $lte: endMonth },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } },
      },
    ]);

    res.json({
      today: {
        orders: (todayAgg[0] && todayAgg[0].orders) || 0,
        revenue: (todayAgg[0] && todayAgg[0].revenue) || 0,
        used: "paid",
      },
      month: {
        orders: (monthAgg[0] && monthAgg[0].orders) || 0,
        revenue: (monthAgg[0] && monthAgg[0].revenue) || 0,
        used: "paid",
      },
    });
  } catch (err) {
    console.error("analytics/summary err:", err);
    res.status(500).json({ error: "server error" });
  }
});

// GET /api/analytics/monthly  -> last 12 months aggregation
router.get("/monthly", async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const pipeline = [
      { $match: { createdAt: { $gte: start }, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ];
    const rows = await Order.aggregate(pipeline);
    res.json(rows);
  } catch (err) {
    console.error("analytics/monthly err:", err);
    res.status(500).json({ error: "server error" });
  }
});

// GET /api/analytics/top-products?limit=6
router.get("/top-products", async (req, res) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 6);
    const pipeline = [
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalQty: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
        },
      },
      { $sort: { totalQty: -1, revenue: -1 } },
      { $limit: limit },
      { $project: { name: "$_id", totalQty: 1, revenue: 1, _id: 0 } },
    ];
    const rows = await Order.aggregate(pipeline);
    res.json(rows);
  } catch (err) {
    console.error("analytics/top-products err:", err);
    res.status(500).json({ error: "server error" });
  }
});

// GET /api/analytics/by-cashier
// NOTE: assumes orders may contain a `cashier` or `createdBy` field storing username/id
router.get("/by-cashier", async (req, res) => {
  try {
    const pipeline = [
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: { $ifNull: ["$cashier", "$createdBy"] },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $project: { cashierName: "$_id", revenue: 1, orders: 1, _id: 0 } },
    ];
    const rows = await Order.aggregate(pipeline);
    res.json(rows);
  } catch (err) {
    console.error("analytics/by-cashier err:", err);
    res.status(500).json({ error: "server error" });
  }
});

// GET /api/analytics/time-of-day
router.get("/time-of-day", async (req, res) => {
  try {
    // buckets: pagi (04-10), siang (10-14), sore (14-18), malam (18-24 & 0-4)
    const pipeline = [
      { $match: { status: { $ne: "cancelled" } } },
      {
        $project: {
          total: 1,
          hour: { $hour: { date: "$createdAt", timezone: "UTC" } }, // if timezone matters, adjust
        },
      },
      {
        $addFields: {
          bucket: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [{ $gte: ["$hour", 4] }, { $lt: ["$hour", 10] }],
                  },
                  then: "Pagi (04-10)",
                },
                {
                  case: {
                    $and: [{ $gte: ["$hour", 10] }, { $lt: ["$hour", 14] }],
                  },
                  then: "Siang (10-14)",
                },
                {
                  case: {
                    $and: [{ $gte: ["$hour", 14] }, { $lt: ["$hour", 18] }],
                  },
                  then: "Sore (14-18)",
                },
                {
                  case: {
                    $and: [{ $gte: ["$hour", 18] }, { $lt: ["$hour", 24] }],
                  },
                  then: "Malam (18-24)",
                },
              ],
              default: "Malam (00-04)",
            },
          },
        },
      },
      {
        $group: {
          _id: "$bucket",
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { orders: -1 } },
    ];
    const rows = await Order.aggregate(pipeline);
    res.json(rows);
  } catch (err) {
    console.error("analytics/time-of-day err:", err);
    res.status(500).json({ error: "server error" });
  }
});

export default router;
