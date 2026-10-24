const mongoose = require('mongoose');
const Resource = require('../models/Resource');

// Initial resources template for seeding
const defaultResources = [
  { customId: 'RES001', name: 'Data Structures & Algorithms', type: 'Book', department: 'CSE', totalQuantity: 5, availableQuantity: 5 },
  { customId: 'RES002', name: 'Database Management Systems', type: 'Book', department: 'CSE', totalQuantity: 4, availableQuantity: 4 },
  { customId: 'RES003', name: 'Computer Networks', type: 'Book', department: 'CSE', totalQuantity: 4, availableQuantity: 4 },
  { customId: 'RES004', name: 'Scientific Calculator', type: 'Equipment', department: 'CSE', totalQuantity: 5, availableQuantity: 5 },
  { customId: 'RES005', name: 'Laptop', type: 'Equipment', department: 'CSE', totalQuantity: 2, availableQuantity: 2 },
  { customId: 'RES006', name: 'Machine Learning', type: 'Book', department: 'AI & ML', totalQuantity: 5, availableQuantity: 5 },
  { customId: 'RES007', name: 'Python Programming', type: 'Book', department: 'AI & ML', totalQuantity: 5, availableQuantity: 5 },
  { customId: 'RES008', name: 'GPU Workstation', type: 'Equipment', department: 'AI & ML', totalQuantity: 2, availableQuantity: 2 },
  { customId: 'RES009', name: 'Digital Electronics', type: 'Book', department: 'ECE', totalQuantity: 5, availableQuantity: 5 },
  { customId: 'RES010', name: 'Arduino Kit', type: 'Equipment', department: 'ECE', totalQuantity: 3, availableQuantity: 3 }
];

// Helper to find resource by ObjectId or customId
const findResourceByIdOrCustomId = async (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const resource = await Resource.findById(id);
    if (resource) return resource;
  }
  return await Resource.findOne({ customId: id });
};

// @desc    Get all resources
// @route   GET /api/resources
// @access  Public
const getResources = async (req, res, next) => {
  try {
    // Auto-seed if database is completely empty
    const count = await Resource.countDocuments();
    if (count === 0) {
      await Resource.insertMany(defaultResources);
    }

    const { type, department, search } = req.query;
    const filter = {};

    if (type && type !== 'All') {
      filter.type = type;
    }

    if (department) {
      filter.department = department;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { department: searchRegex },
        { type: searchRegex },
        { customId: searchRegex }
      ];
    }

    const resources = await Resource.find(filter).sort({ createdAt: 1, customId: 1 });

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get resource by ID
// @route   GET /api/resources/:id
// @access  Public
const getResourceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const resource = await findResourceByIdOrCustomId(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: `Resource with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      data: resource
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new resource
// @route   POST /api/resources
// @access  Public
const createResource = async (req, res, next) => {
  try {
    const { customId, name, type, department, totalQuantity, availableQuantity } = req.body;

    if (!name || !department || totalQuantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, department, and totalQuantity are required'
      });
    }

    const parsedTotal = Number(totalQuantity);
    if (isNaN(parsedTotal) || parsedTotal < 0) {
      return res.status(400).json({
        success: false,
        message: 'totalQuantity must be a positive number or zero'
      });
    }

    const parsedAvailable = availableQuantity !== undefined
      ? Number(availableQuantity)
      : parsedTotal;

    if (isNaN(parsedAvailable) || parsedAvailable < 0) {
      return res.status(400).json({
        success: false,
        message: 'availableQuantity must be a positive number or zero'
      });
    }

    if (parsedAvailable > parsedTotal) {
      return res.status(400).json({
        success: false,
        message: 'availableQuantity cannot exceed totalQuantity'
      });
    }

    const newResource = new Resource({
      customId,
      name: name.trim(),
      type: type || 'Book',
      department: department.trim(),
      totalQuantity: parsedTotal,
      availableQuantity: parsedAvailable
    });

    const savedResource = await newResource.save();

    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data: savedResource
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a resource
// @route   PUT /api/resources/:id
// @access  Public
const updateResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resource = await findResourceByIdOrCustomId(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: `Resource with ID '${id}' not found`
      });
    }

    const { name, type, department, totalQuantity, availableQuantity } = req.body;

    if (name !== undefined) resource.name = name.trim();
    if (type !== undefined) resource.type = type;
    if (department !== undefined) resource.department = department.trim();

    if (totalQuantity !== undefined) {
      const parsedTotal = Number(totalQuantity);
      if (isNaN(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({
          success: false,
          message: 'totalQuantity must be a positive number or zero'
        });
      }
      resource.totalQuantity = parsedTotal;
    }

    if (availableQuantity !== undefined) {
      const parsedAvailable = Number(availableQuantity);
      if (isNaN(parsedAvailable) || parsedAvailable < 0) {
        return res.status(400).json({
          success: false,
          message: 'availableQuantity must be a positive number or zero'
        });
      }
      if (parsedAvailable > resource.totalQuantity) {
        return res.status(400).json({
          success: false,
          message: 'availableQuantity cannot exceed totalQuantity'
        });
      }
      resource.availableQuantity = parsedAvailable;
    }

    const updatedResource = await resource.save();

    res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      data: updatedResource
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a resource
// @route   DELETE /api/resources/:id
// @access  Public
const deleteResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resource = await findResourceByIdOrCustomId(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: `Resource with ID '${id}' not found`
      });
    }

    await Resource.findByIdAndDelete(resource._id);

    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully',
      data: { id: resource.customId || resource._id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  findResourceByIdOrCustomId
};
