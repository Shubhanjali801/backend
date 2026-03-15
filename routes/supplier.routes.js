const express = require("express");
const authorizeRoles = require("../middleware/role.middleware");
const protect = require("../middleware/auth.middleware");
const router = express.Router();

const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require("../controllers/supplier.controller");

router.route("/")
  .get(protect, getSuppliers)                                          
  .post(protect, authorizeRoles("admin", "purchase"), createSupplier); 

router.route("/:id")
  .get(protect, getSupplier)                                           
  .put(protect, authorizeRoles("admin", "purchase"), updateSupplier) 
  .delete(protect, authorizeRoles("admin"), deleteSupplier);          

module.exports = router;