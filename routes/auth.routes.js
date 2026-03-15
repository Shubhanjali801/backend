// ─────────────────────────────────────────────────────────────
// routes/auth.routes.js
// ─────────────────────────────────────────────────────────────
const express = require("express");
const authorizeRoles = require("../middleware/role.middleware");
const User = require("../models/User");
const protect = require("../middleware/auth.middleware");
const { 
  register, 
  login, 
  logout 
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);

// Get current user profile
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: list / update / delete users
router.get("/users", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = req.query.search
      ? { $or: [{ name: { $regex: req.query.search, $options: "i" } }, { email: { $regex: req.query.search, $options: "i" } }] }
      : {};
    const total = await User.countDocuments(query);
    const users = await User.find(query).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 });
    res.json({ success: true, data: users, total, currentPage: page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: update users
router.put("/users/:id", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User updated", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: list specifice users
router.get("/users/:id", protect, authorizeRoles("admin"), async (req, res) => {
  try {

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});

// Admin: delete users
router.delete("/users/:id", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
