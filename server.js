const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet")       
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error.middleware");

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ── Core Middleware ───────────────────────────────────────────
app.use(helmet())                                    // Security
app.use(cors({ origin: "http://localhost:5173" }))   
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/products", require("./routes/product.routes"));
app.use("/api/customers", require("./routes/customer.routes"));
app.use("/api/suppliers", require("./routes/supplier.routes"));
app.use("/api/sales-orders", require("./routes/sales.order.routes"));
app.use("/api/purchase-orders", require("./routes/purchase.order.routes"));
app.use("/api/grn", require("./routes/grn.routes"));
app.use("/api/invoices", require("./routes/invoice.routes"));

// Health check
app.get("/", (req, res) => res.json({ message: "ERP API is running ✅" }));

// ── Error Handling (must be last) ─────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
