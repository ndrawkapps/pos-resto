import jwt from "jsonwebtoken";
import User from "../models/User.js";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "bdHq4ZP$X7xF!9wzKk@E2jNf3tLqG5cA7vV8mY1rH6pD9uR3bC";

export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"] || "";
    console.log("AUTH HEADER:", authHeader);
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    console.log("TOKEN:", token);

    if (!token) return res.status(403).json({ message: "Token tidak ada" });

    // optional: inspect token without verifying
    try {
      const dec = jwt.decode(token, { complete: true });
      console.log("DECODED (unverified):", dec);
    } catch (e) {}

    const decoded = jwt.verify(token, JWT_SECRET); // throws if invalid
    if (!decoded || !decoded.id)
      return res.status(401).json({ message: "Token tidak valid" });

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User tidak ditemukan" });

    req.user = user;
    next();
  } catch (err) {
    console.error("verifyToken err:", err.message || err);
    return res.status(401).json({ message: "Token tidak valid" });
  }
}
