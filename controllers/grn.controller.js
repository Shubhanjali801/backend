const GRN = require("../models/GRN");
const PurchaseOrder = require("../models/Purchase.Order");
const Product = require("../models/Product");

// @desc    Get all GRNs
// @route   GET /api/grn
// @access  Private (Admin / Inventory)
exports.getGRNs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.query.status) filter.status = req.query.status;

    const total = await GRN.countDocuments(filter);
    const grns = await GRN.find(filter)
      .populate("purchaseOrder", "status supplier")
      .populate("receivedItems.product", "title SKU stock")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: grns.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: grns,
    });
  } catch (error) {
    console.error("Get GRNs error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching GRNs" });
  }
};

// @desc    Get single GRN
// @route   GET /api/grn/:id
// @access  Private
exports.getGRN = async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id)
      .populate({
        path: "purchaseOrder",
        populate: { path: "supplier", select: "name contact address" },
      })
      .populate("receivedItems.product", "title SKU price stock");

    if (!grn) {
      return res.status(404).json({ success: false, message: "GRN not found" });
    }

    res.status(200).json({ success: true, data: grn });
  } catch (error) {
    console.error("Get GRN error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid GRN ID" });
    }
    res.status(500).json({ success: false, message: "Server error while fetching GRN" });
  }
};

// @desc    Create a GRN linked to a Purchase Order (also updates product stock)
// @route   POST /api/grn
// @access  Private (Admin / Inventory)
exports.createGRN = async (req, res) => {
  try {
    const { purchaseOrder: poId, receivedItems, receiptDate } = req.body;

    if (!poId || !receivedItems || receivedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "purchaseOrder and at least one receivedItem are required",
      });
    }

    // Validate purchase order
    const purchaseOrder = await PurchaseOrder.findById(poId);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }
    if (purchaseOrder.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot create a GRN for a cancelled purchase order",
      });
    }
    if (purchaseOrder.status === "received") {
      return res.status(400).json({
        success: false,
        message: "A GRN has already been created for this purchase order",
      });
    }

    // Validate each received item and update product stock
    for (const item of receivedItems) {
      if (
        !item.product ||
        item.orderedQuantity === undefined ||
        item.receivedQuantity === undefined ||
        item.price === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Each item requires product, orderedQuantity, receivedQuantity, and price",
        });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product} not found`,
        });
      }

      // Add received quantity to current stock
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.receivedQuantity },
      });
    }

    // Determine GRN completion status
    // "partial" if any item received less than ordered, "complete" otherwise
    const isPartial = receivedItems.some(
      (item) => item.receivedQuantity < item.orderedQuantity
    );

    const grn = await GRN.create({
      purchaseOrder: poId,
      receivedItems,
      receiptDate: receiptDate || Date.now(),
      status: isPartial ? "partial" : "complete",
    });

    // Mark purchase order as is Partial confirmed o.w. received
    await PurchaseOrder.findByIdAndUpdate(poId, { status: isPartial ? "confirmed" : "received" });

    const populated = await grn.populate([
      { path: "purchaseOrder", select: "status supplier" },
      { path: "receivedItems.product", select: "title SKU stock" },
    ]);

    res.status(201).json({
      success: true,
      message: `GRN created successfully (${grn.status}). Stock updated for ${receivedItems.length} product(s).`,
      data: populated,
    });
  } catch (error) {
    console.error("Create GRN error:", error);
    res.status(500).json({ success: false, message: "Server error while creating GRN" });
  }
};