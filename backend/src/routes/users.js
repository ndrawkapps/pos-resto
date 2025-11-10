// backend/src/routes/users.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "bdHq4ZP$X7xF!9wzKk@E2jNf3tLqG5cA7vV8mY1rH6pD9uR3bC";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

// CREATE user
router.post("/", async (req, res) => {
  try {
    const { username, password, role, name } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ success: false, message: "username & password required" });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashed,
      role: role || "cashier",
      name: name || null,
    });
    await user.save();
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// READ all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE user
router.put("/:id", async (req, res) => {
  try {
    const { username, password, role, name } = req.body;
    const updateData = { username, role, name };
    if (password) updateData.password = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE user
router.delete("/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// LOGIN -> return token + user
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username and password required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Wrong password" });

    const payload = { id: user._id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    const safeUser = {
      id: user._id,
      username: user.username,
      role: user.role,
      name: user.name || null,
    };
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
