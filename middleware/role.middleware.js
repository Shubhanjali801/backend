/**
 * authorizeRoles(...roles)
 * Usage in routes: router.get("/", protect, authorizeRoles("admin", "sales"), handler)
 * Must be placed AFTER auth.middleware (which sets req.user)
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(", ")}. Your role: ${req.user?.role || "none"}`,
      });
    }
    next();
  };
};

module.exports = authorizeRoles;