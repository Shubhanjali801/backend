const Customer = require("../models/Customer");

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { contact: { $regex: req.query.search, $options: "i" } },
        { address: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching customers" });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.error("Get customer error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid customer ID" });
    }
    res.status(500).json({ success: false, message: "Server error while fetching customer" });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private (Admin / Sales)
exports.createCustomer = async (req, res) => {
  try {
    const { name, contact, address } = req.body;

    if (!name || !contact || !address) {
      return res.status(400).json({
        success: false,
        message: "name, contact, and address are required",
      });
    }

    const customer = await Customer.create({
      name: name.trim(),
      contact: contact.trim(),
      address: address.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({ success: false, message: "Server error while creating customer" });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private (Admin / Sales)
exports.updateCustomer = async (req, res) => {
  try {
    const { name, contact, address } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Only update provided fields
    if (name !== undefined) customer.name = name.trim();
    if (contact !== undefined) customer.contact = contact.trim();
    if (address !== undefined) customer.address = address.trim();

    await customer.save();

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({ success: false, message: "Server error while updating customer" });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin only)
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      data: { id: customer._id, name: customer.name },
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting customer" });
  }
};