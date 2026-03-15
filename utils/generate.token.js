const jwt = require("jsonwebtoken");

/**
 * generateToken
 * Signs a JWT containing the user's id and role.
 * auth.controller.js calls: generateToken(user._id, user.role)
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

/**
 * verifyToken
 * Synchronously verifies and decodes a JWT.
 * auth.middleware.js calls: verifyToken(token)
 * Throws on invalid / expired tokens — caught by the middleware's try/catch.
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
