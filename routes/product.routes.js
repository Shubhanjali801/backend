const express = require("express");
const authorizeRoles = require("../middleware/role.middleware");
const {
  getProducts, 
  getProductsByCategory, 
  getLowStockProducts,
  getProduct, 
  createProduct, 
  updateProduct, 
  deleteProduct,
} = require("../controllers/product.controller");
const protect = require("../middleware/auth.middleware");
const router = express.Router();

// Specific routes before /:id to avoid collision
router.get("/low-stock", protect, authorizeRoles("admin", "inventory"), getLowStockProducts);
router.get("/category/:category", protect, getProductsByCategory);

router.route("/")
  .get(protect, getProducts)
  .post(protect, authorizeRoles("admin", "inventory"), createProduct);

router.route("/:id")
  .get(protect, getProduct)
  .put(protect, authorizeRoles("admin", "inventory"), updateProduct)
  .delete(protect, authorizeRoles("admin"), deleteProduct);

module.exports = router;
