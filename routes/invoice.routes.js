const express = require("express");
const authorizeRoles = require("../middleware/role.middleware");
const router = express.Router();
const protect = require("../middleware/auth.middleware");
const { 
    getInvoices, 
    getInvoice, 
    createInvoice, 
    updateInvoice, 
    deleteInvoice 
} = require("../controllers/invoice.controller");

router.route("/")
.get(protect, getInvoices)
.post(protect, authorizeRoles("admin", "sales"), createInvoice);

router.route("/:id")
.get(protect, getInvoice)
.put(protect, authorizeRoles("admin", "sales"), updateInvoice)
.delete(protect, authorizeRoles("admin"), deleteInvoice);

module.exports = router;
