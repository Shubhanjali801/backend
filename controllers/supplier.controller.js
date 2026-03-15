const Supplier = require("../models/Supplier");

// GET all suppliers
const getSuppliers = async (req, res) => {
  try {

    const suppliers = await Supplier.find();

    res.status(200).json({
      success: true,
      data: suppliers
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};

// GET single supplier
const getSupplier = async (req, res) => {

  try {

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    res.status(200).json({
      success: true,
      data: supplier
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};

// CREATE supplier
const createSupplier = async (req, res) => {

  try {

    const { name, contact, address } = req.body;

    const supplier = await Supplier.create({
      name,
      contact,
      address
    });

    res.status(201).json({
      success: true,
      data: supplier
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};

// UPDATE supplier
const updateSupplier = async (req, res) => {

  try {

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    res.status(200).json({
      success: true,
      data: supplier
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};

// DELETE supplier
const deleteSupplier = async (req, res) => {

  try {

    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Supplier deleted"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};

module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
};