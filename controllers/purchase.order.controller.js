const PurchaseOrder = require("../models/Purchase.Order"); // Note: matches existing filename

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
// @access  Private
exports.getPurchaseOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.query.status) filter.status = req.query.status;

    const total = await PurchaseOrder.countDocuments(filter);
    const orders = await PurchaseOrder.find(filter)
      .populate("supplier", "name contact")
      .populate("products.product", "title SKU")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: orders,
    });
  } catch (error) {
    console.error("Get purchase orders error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching purchase orders" });
  }
};

// @desc    Get single purchase order
// @route   GET /api/purchase-orders/:id
// @access  Private
exports.getPurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate("supplier", "name contact address")
      .populate("products.product", "title SKU price stock");

    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Get purchase order error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid purchase order ID" });
    }
    res.status(500).json({ success: false, message: "Server error while fetching purchase order" });
  }
};

// @desc    Create new purchase order
// @route   POST /api/purchase-orders
// @access  Private (Admin / Purchase)
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, products } = req.body;

    if (!supplier || !products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "supplier and at least one product are required",
      });
    }

    // Validate each product item
    for (const item of products) {
      if (!item.product || !item.quantity || item.quantity < 1 || item.price < 0) {
        return res.status(400).json({
          success: false,
          message: "Each product item requires product id, quantity (>=1), and price (>=0)",
        });
      }
    }

    const order = await PurchaseOrder.create({ supplier, products, status: "pending" });

    const populated = await order.populate([
      { path: "supplier", select: "name contact" },
      { path: "products.product", select: "title SKU" },
    ]);

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create purchase order error:", error);
    res.status(500).json({ success: false, message: "Server error while creating purchase order" });
  }
};

// @desc    Update purchase order status or items
// @route   PUT /api/purchase-orders/:id
// @access  Private (Admin / Purchase)
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }

    // Block modification of already-closed orders
    if (order.status === "received" || order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot modify a purchase order with status: "${order.status}"`,
      });
    }

    const { status, products } = req.body;

    if (status) order.status = status;
    if (products) order.products = products;

    await order.save();

    const populated = await order.populate([
      { path: "supplier", select: "name contact" },
      { path: "products.product", select: "title SKU" },
    ]);

    res.status(200).json({
      success: true,
      message: "Purchase order updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Update purchase order error:", error);
    res.status(500).json({ success: false, message: "Server error while updating purchase order" });
  }
};

// @desc    Cancel purchase order
// @route   DELETE /api/purchase-orders/:id
// @access  Private (Admin only)
exports.cancelPurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }

    if (order.status === "received") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a purchase order that has already been received",
      });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Purchase order is already cancelled" });
    }

    order.status = "cancelled";
    await order.save();

    res.status(200).json({ success: true, message: "Purchase order cancelled successfully" });
  } catch (error) {
    console.error("Cancel purchase order error:", error);
    res.status(500).json({ success: false, message: "Server error while cancelling purchase order" });
  }
};