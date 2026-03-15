const SalesOrder = require("../models/Sales.Order");
const Product = require("../models/Product");

// @desc    Get all sales orders
// @route   GET /api/sales-orders
// @access  Private
exports.getSalesOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.query.status) filter.status = req.query.status;

    const total = await SalesOrder.countDocuments(filter);
    const orders = await SalesOrder.find(filter)
      .populate("customer", "name contact")
      .populate("products.product", "title SKU price")
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
    console.error("Get sales orders error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching sales orders" });
  }
};

// @desc    Get single sales order
// @route   GET /api/sales-orders/:id
// @access  Private
exports.getSalesOrder = async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id)
      .populate("customer", "name contact address")
      .populate("products.product", "title SKU price stock");

    if (!order) {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Get sales order error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid sales order ID" });
    }
    res.status(500).json({ success: false, message: "Server error while fetching sales order" });
  }
};

// @desc    Create new sales order (validates + deducts stock)
// @route   POST /api/sales-orders
// @access  Private (Admin / Sales)
exports.createSalesOrder = async (req, res) => {
  try {
    const { customer, products } = req.body;

    if (!customer || !products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "customer and at least one product are required",
      });
    }

    // Validate stock availability and build line items
    let totalPrice = 0;
    const lineItems = [];

    for (const item of products) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Each product item requires a product ID and quantity >= 1",
        });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product} not found`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.title}". Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      // Use current product price as the line price (snapshotted)
      const linePrice = product.price;
      totalPrice += linePrice * item.quantity;

      lineItems.push({
        product: product._id,
        quantity: item.quantity,
        price: linePrice,
      });
    }

    const order = await SalesOrder.create({
      customer,
      products: lineItems,
      totalPrice,
      status: req.body.status || "pending",
    });

    // Deduct stock after successful order creation
    for (const item of lineItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    const populated = await order.populate([
      { path: "customer", select: "name contact" },
      { path: "products.product", select: "title SKU price" },
    ]);

    res.status(201).json({
      success: true,
      message: "Sales order created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create sales order error:", error);
    res.status(500).json({ success: false, message: "Server error while creating sales order" });
  }
};

// @desc    Update sales order status
// @route   PUT /api/sales-orders/:id
// @access  Private (Admin / Sales)
exports.updateSalesOrder = async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }

    // Cannot modify a delivered or cancelled order
    if (order.status === "delivered" || order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot modify an order with status: "${order.status}"`,
      });
    }

    const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (req.body.status && !validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    if (req.body.status) order.status = req.body.status;

    await order.save();

    const populated = await order.populate([
      { path: "customer", select: "name contact" },
      { path: "products.product", select: "title SKU price" },
    ]);

    res.status(200).json({
      success: true,
      message: "Sales order updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Update sales order error:", error);
    res.status(500).json({ success: false, message: "Server error while updating sales order" });
  }
};

// @desc    Cancel sales order (restores stock)
// @route   DELETE /api/sales-orders/:id
// @access  Private (Admin only)
exports.cancelSalesOrder = async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }

    if (order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a delivered order",
      });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Order is already cancelled" });
    }

    // Restore stock for each product
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    order.status = "cancelled";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Sales order cancelled and stock restored successfully",
    });
  } catch (error) {
    console.error("Cancel sales order error:", error);
    res.status(500).json({ success: false, message: "Server error while cancelling sales order" });
  }
};
