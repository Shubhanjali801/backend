const mongoose = require("mongoose");

const grnSchema = new mongoose.Schema({
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PurchaseOrder",
    required: true
  },
  receivedItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    orderedQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    receivedQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  receiptDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["partial", "complete"],
    default: "complete"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("GRN", grnSchema);
