const express = require("express");
const authorizeRoles = require("../middleware/role.middleware");
const router = express.Router();
const protect = require("../middleware/auth.middleware");
const { 
    getCustomers, 
    getCustomer, 
    createCustomer, 
    updateCustomer, 
    deleteCustomer 
} = require("../controllers/customer.controller");

router.route("/")
.get(protect, getCustomers)
.post(protect, authorizeRoles("admin", "sales"), createCustomer);

router.route("/:id")
.get(protect, getCustomer)
.put(protect, authorizeRoles("admin", "sales"), updateCustomer)
.delete(protect, authorizeRoles("admin"), deleteCustomer);

module.exports = router;
