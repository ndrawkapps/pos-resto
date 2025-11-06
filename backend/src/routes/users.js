import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const router = express.Router();

// ✅ CREATE user
router.post("/", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, role });
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ READ all users
router.get("/", async (req, res) => {
  const users = await User.find({}, "-password");
  res.json(users);
});

// ✅ UPDATE user
router.put("/:id", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const updateData = { username, role };
    if (password) updateData.password = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ DELETE user
router.delete("/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ✅ LOGIN endpoint
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Wrong password" });

  res.json({
    success: true,
    user: { id: user._id, username: user.username, role: user.role },
  });
});

// ✅ jangan lupa export default
export default router;
