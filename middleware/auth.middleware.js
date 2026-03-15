const { verifyToken } = require("../utils/generate.token");
const { tokenBlocklist } = require("../controllers/auth.controller");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({ success: false, message: "Access denied. Invalid token format." });
    }

    // ── Check if token has been logged out ────────────────────
    if (tokenBlocklist.has(token)) {
      return res.status(401).json({ success: false, message: "Token has been invalidated. Please log in again." });
    }

    // Verify and decode token
    const decoded = verifyToken(token);

    if (!decoded.id || !decoded.role) {
      return res.status(401).json({ success: false, message: "Access denied. Invalid token." });
    }

    req.user = { id: decoded.id, role: decoded.role };
    next();

  } catch (error) {
    console.error("JWT verification error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Access denied. Token has expired." });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Access denied. Invalid token." });
    } else {
      return res.status(401).json({ success: false, message: "Access denied. Authentication failed." });
    }
  }
};