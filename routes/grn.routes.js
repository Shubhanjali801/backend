const express = require("express");
const authorizeRoles = require("../middleware/role.middleware");
const router = express.Router();
const protect = require("../middleware/auth.middleware");
const { 
    getGRNs, 
    getGRN, 
    createGRN 
} = require("../controllers/grn.controller");

router.get("/", protect, authorizeRoles("admin", "inventory"), getGRNs);
router.post("/", protect, authorizeRoles("admin", "inventory"), createGRN);
router.get("/:id", protect, getGRN);

module.exports = router;
