const express = require("express");
const authorizeRoles = require("../middleware/role.middleware");
const protect = require("../middleware/auth.middleware");
const { 
    getPurchaseOrders, 
    getPurchaseOrder, 
    createPurchaseOrder, 
    updatePurchaseOrder, 
    cancelPurchaseOrder 
} = require("../controllers/purchase.order.controller");
const router = express.Router();

router.route("/")
.get(protect, getPurchaseOrders)
.post(protect, authorizeRoles("admin", "purchase"), createPurchaseOrder);

router.route("/:id")
.get(protect, getPurchaseOrder)
.put(protect, authorizeRoles("admin", "purchase"), updatePurchaseOrder)
.delete(protect, authorizeRoles("admin"), cancelPurchaseOrder);

module.exports = router;
