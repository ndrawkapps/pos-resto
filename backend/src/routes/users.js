// backend/src/routes/users.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "please_change_this_in_prod";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

/* other CRUD routes (create/read/update/delete) remain unchanged */

// LOGIN endpoint -> returns { token, user }
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Wrong password" });

    const payload = {
      id: user._id,
      username: user.username,
      role: user.role,
    };

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
