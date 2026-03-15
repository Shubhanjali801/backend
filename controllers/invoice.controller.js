const Invoice = require("../models/Invoice");
const SalesOrder = require("../models/Sales.Order");

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.invoiceNumber = { $regex: req.query.search, $options: "i" };
    }

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate("salesOrder", "status totalPrice customer")
      .populate("items.product", "title SKU")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: invoices,
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching invoices" });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({
        path: "salesOrder",
        populate: { path: "customer", select: "name contact address" },
      })
      .populate("items.product", "title SKU price");

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error("Get invoice error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid invoice ID" });
    }
    res.status(500).json({ success: false, message: "Server error while fetching invoice" });
  }
};

// @desc    Create invoice linked to a Sales Order
// @route   POST /api/invoices
// @access  Private (Admin / Sales)
exports.createInvoice = async (req, res) => {
  try {
    const { salesOrder: soId, dueDate } = req.body;

    if (!soId || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "salesOrder and dueDate are required",
      });
    }

    // Validate sales order
    const salesOrder = await SalesOrder.findById(soId).populate(
      "products.product",
      "title SKU price"
    );
    if (!salesOrder) {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }

    // Prevent duplicate invoice for same sales order
    const existing = await Invoice.findOne({ salesOrder: soId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "An invoice already exists for this sales order",
      });
    }

    // Build items array from sales order products
    // Each item stores the snapshot price at the time of invoicing
    const items = salesOrder.products.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.price,               // price stored on the sales order line
      total: item.price * item.quantity,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    // Auto-generate invoice number: INV-YYYYMMDD-XXXXX
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${datePart}-${String(count + 1).padStart(5, "0")}`;

    const invoice = await Invoice.create({
      salesOrder: soId,
      invoiceNumber,
      items,
      totalAmount,
      dueDate,
      status: "draft",
    });

    const populated = await invoice.populate([
      { path: "salesOrder", select: "status totalPrice" },
      { path: "items.product", select: "title SKU" },
    ]);

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ success: false, message: "Server error while creating invoice" });
  }
};

// @desc    Update invoice status (sent → paid / overdue / cancelled)
// @route   PUT /api/invoices/:id
// @access  Private (Admin / Sales)
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    // Cannot modify a paid or cancelled invoice
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot modify an invoice with status: "${invoice.status}"`,
      });
    }

    const validStatuses = ["draft", "sent", "paid", "overdue", "cancelled"];
    if (req.body.status && !validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    if (req.body.status) invoice.status = req.body.status;
    if (req.body.dueDate) invoice.dueDate = req.body.dueDate;

    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({ success: false, message: "Server error while updating invoice" });
  }
};

// @desc    Delete / void invoice (only non-paid invoices)
// @route   DELETE /api/invoices/:id
// @access  Private (Admin only)
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a paid invoice",
      });
    }

    await invoice.deleteOne();

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
      data: { id: invoice._id, invoiceNumber: invoice.invoiceNumber },
    });
  } catch (error) {
    console.error("Delete invoice error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting invoice" });
  }
};