const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "Token tidak ada" });

  try {
    const decoded = jwt.verify(token.split(" ")[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token tidak valid" });
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Akses ditolak: hanya admin" });
  next();
}

module.exports = { verifyToken, isAdmin };
