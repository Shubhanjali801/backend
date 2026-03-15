const User = require("../models/User");
const { generateToken } = require("../utils/generate.token");

// In-memory token blocklist for logout
// For production, replace with Redis
const tokenBlocklist = new Set();

// ── Register ──────────────────────────────────────────────────
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role = "sales" } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ msg: "Password must be at least 8 characters long" });
    }

    // Duplicate check
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Create user (password hashed by pre-save middleware)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
    });

    res.status(201).json({
      msg: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });

  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        msg: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      });
    }
    res.status(500).json({ msg: "Server error during registration" });
  }
};

// ── Login ─────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    // findForAuth explicitly selects password (hidden by select:false)
    const user = await User.findForAuth(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      msg: "Login successful!",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ msg: "Server error during login" });
  }
};

// ── Logout ────────────────────────────────────────────────────
// @route   POST /api/auth/logout
// @access  Private (requires valid token)
exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res.status(400).json({ msg: "No token provided" });
    }

    // Blocklist the token so it cannot be reused
    tokenBlocklist.add(token);

    res.json({ msg: "Logged out successfully" });

  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ msg: "Server error during logout" });
  }
};

// Exported so auth.middleware.js can check against it on every request
exports.tokenBlocklist = tokenBlocklist;