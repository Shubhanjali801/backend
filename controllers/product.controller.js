const Product = require("../models/Product");

// Validation helper function
const validateProductData = (data, isUpdate = false) => {
  const errors = [];

  // Required fields for both create and update
  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push("Title is required and must be a non-empty string");
    } else if (data.title.length > 100) {
      errors.push("Title cannot exceed 100 characters");
    }
  }

  if (!isUpdate || data.SKU !== undefined) {
    if (!data.SKU || typeof data.SKU !== 'string' || data.SKU.trim().length === 0) {
      errors.push("SKU is required and must be a non-empty string");
    } else if (data.SKU.length > 50) {
      errors.push("SKU cannot exceed 50 characters");
    }
  }

  if (!isUpdate || data.price !== undefined) {
    if (data.price === undefined || data.price === null || isNaN(data.price) || data.price < 0) {
      errors.push("Price is required and must be a non-negative number");
    }
  }

  if (!isUpdate || data.stock !== undefined) {
    if (data.stock === undefined || data.stock === null || isNaN(data.stock) || data.stock < 0) {
      errors.push("Stock is required and must be a non-negative number");
    }
  }

  if (!isUpdate || data.reorderLevel !== undefined) {
    if (data.reorderLevel === undefined || data.reorderLevel === null || isNaN(data.reorderLevel) || data.reorderLevel < 0) {
      errors.push("Reorder level is required and must be a non-negative number");
    }
  }

  // Optional field validations
  if (data.description && data.description.length > 500) {
    errors.push("Description cannot exceed 500 characters");
  }

  if (data.category && data.category.length > 50) {
    errors.push("Category cannot exceed 50 characters");
  }

  if (data.unit && !["pieces", "kg", "lbs", "liters", "meters", "boxes", "packs"].includes(data.unit)) {
    errors.push("Unit must be one of: pieces, kg, lbs, liters, meters, boxes, packs");
  }

  return errors;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private (requires authentication)
// @query   ?category=electronics&isActive=true&search=wireless&page=1&limit=10
exports.getProducts = async (req, res) => {
  try {
    let query = {};

    // Filter by category
    if (req.query.category) {
      query.category = { $regex: req.query.category, $options: 'i' };
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Search in title, SKU, or description
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { SKU: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sort options
    let sort = { createdAt: -1 }; // Default: newest first
    if (req.query.sort) {
      const sortBy = req.query.sort.startsWith('-') ? req.query.sort.substring(1) : req.query.sort;
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sort = { [sortBy]: sortOrder };
    }

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: products
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching products"
    });
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (requires authentication)
exports.createProduct = async (req, res) => {
  try {
    // Validate input data
    const validationErrors = validateProductData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ SKU: req.body.SKU.trim() });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists"
      });
    }

    // Sanitize data
    const productData = {
      title: req.body.title.trim(),
      SKU: req.body.SKU.trim(),
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      reorderLevel: Number(req.body.reorderLevel),
      description: req.body.description ? req.body.description.trim() : undefined,
      category: req.body.category ? req.body.category.trim() : undefined,
      unit: req.body.unit || "pieces",
      createdBy: req.user.id // From authenticated user
    };

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });

  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating product"
    });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (requires authentication)
exports.updateProduct = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    // Validate input data if provided
    if (Object.keys(req.body).length > 0) {
      const validationErrors = validateProductData(req.body, true); // true for update mode
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors
        });
      }
    }

    // Check if SKU conflict (only if SKU is being updated)
    if (req.body.SKU) {
      const existingProduct = await Product.findOne({
        SKU: req.body.SKU.trim(),
        _id: { $ne: req.params.id }
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Another product with this SKU already exists"
        });
      }
    }

    // Sanitize update data
    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title.trim();
    if (req.body.SKU !== undefined) updateData.SKU = req.body.SKU.trim();
    if (req.body.price !== undefined) updateData.price = Number(req.body.price);
    if (req.body.stock !== undefined) updateData.stock = Number(req.body.stock);
    if (req.body.reorderLevel !== undefined) updateData.reorderLevel = Number(req.body.reorderLevel);
    // if (req.body.description !== undefined) updateData.description = req.body.description ? req.body.description.trim() : undefined;
    // if (req.body.category !== undefined) updateData.category = req.body.category ? req.body.category.trim() : undefined;
    // if (req.body.unit !== undefined) updateData.unit = req.body.unit;
    // if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product
    });

  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating product"
    });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (requires authentication)
exports.deleteProduct = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: {
        id: product._id,
        title: product.title,
        SKU: product.SKU
      }
    });

  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting product"
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Private
exports.getProduct = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching product"
    });
  }
};

// @desc    Get low stock products (reorder alerts)
// @route   GET /api/products/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res) => {
  try {
    // Find products where stock <= reorderLevel
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$stock", "$reorderLevel"] },
      isActive: true
    }).sort({ stock: 1 }); // Sort by lowest stock first

    res.status(200).json({
      success: true,
      count: lowStockProducts.length,
      message: lowStockProducts.length > 0 ?
        `${lowStockProducts.length} products need reordering` :
        "All products are sufficiently stocked",
      data: lowStockProducts
    });

  } catch (error) {
    console.error("Get low stock products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching low stock products"
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Private
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const products = await Product.find({
      category: { $regex: category, $options: 'i' },
      isActive: true
    }).sort({ title: 1 });

    res.status(200).json({
      success: true,
      category,
      count: products.length,
      data: products
    });

  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching products by category"
    });
  }
};