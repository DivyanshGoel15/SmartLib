const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Resource = require('../models/Resource');
const { findResourceByIdOrCustomId } = require('./resourceController');

// Helper to find reservation by ObjectId or customId
const findReservationByIdOrCustomId = async (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const reservation = await Reservation.findById(id);
    if (reservation) return reservation;
  }
  return await Reservation.findOne({ customId: id });
};

// @desc    Get all reservations (optional filters: userId, status, resourceId)
// @route   GET /api/reservations
// @access  Public
const getReservations = async (req, res, next) => {
  try {
    const { userId, status, resourceId } = req.query;
    const filter = {};

    if (userId) {
      filter.userId = String(userId);
    }

    if (status) {
      filter.status = status;
    }

    if (resourceId) {
      filter.resourceId = String(resourceId);
    }

    const reservations = await Reservation.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single reservation by ID
// @route   GET /api/reservations/:id
// @access  Public
const getReservationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reservation = await findReservationByIdOrCustomId(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: `Reservation with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new reservation
// @route   POST /api/reservations
// @access  Public
const createReservation = async (req, res, next) => {
  try {
    const {
      resourceId,
      resourceName,
      userId,
      userName,
      userEmail,
      department,
      year,
      userRole,
      customId
    } = req.body;

    // 1. Basic validation
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required'
      });
    }

    if (!userId || !userName) {
      return res.status(400).json({
        success: false,
        message: 'User ID and User name are required'
      });
    }

    // 2. Verify resource exists in MongoDB
    const resource = await findResourceByIdOrCustomId(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: `Resource with ID '${resourceId}' not found`
      });
    }

    // 3. Check for existing active reservation for the same resource by this user
    const existingActiveForResource = await Reservation.findOne({
      userId: String(userId),
      resourceId: String(resource.customId || resource._id),
      status: 'active'
    });

    if (existingActiveForResource) {
      return res.status(400).json({
        success: false,
        message: 'You already have this resource reserved.'
      });
    }

    // 4. Maximum 2 active resource reservations allowed per user
    const activeCount = await Reservation.countDocuments({
      userId: String(userId),
      status: 'active'
    });

    if (activeCount >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 2 active resource reservations allowed.'
      });
    }

    // 5. Check resource availability
    if (Number(resource.availableQuantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: `Resource '${resource.name}' is currently unavailable.`
      });
    }

    // 6. Decrement available quantity and persist
    resource.availableQuantity = Number(resource.availableQuantity) - 1;
    await resource.save();

    // 7. Create reservation record
    const newReservation = new Reservation({
      customId,
      resourceId: resource.customId || resource._id.toString(),
      resource: resource._id,
      resourceName: resourceName || resource.name,
      userId: String(userId),
      userName,
      userEmail: userEmail || '',
      department: department || '',
      year: year || '',
      userRole: userRole || 'student',
      reservedAt: new Date(),
      status: 'active',
      promotedFromQueue: false
    });

    const savedReservation = await newReservation.save();

    res.status(201).json({
      success: true,
      message: `${resource.name} reserved successfully.`,
      data: savedReservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a reservation (e.g. return resource or update details)
// @route   PUT /api/reservations/:id or PATCH /api/reservations/:id
// @access  Public
const updateReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reservation = await findReservationByIdOrCustomId(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: `Reservation with ID '${id}' not found`
      });
    }

    const { status, returnedAt } = req.body;

    // Handle resource return
    if (status === 'returned' && reservation.status !== 'returned') {
      reservation.status = 'returned';
      reservation.returnedAt = returnedAt ? new Date(returnedAt) : new Date();

      // Restore resource availability in MongoDB
      const resource = await findResourceByIdOrCustomId(reservation.resourceId);
      if (resource) {
        if (resource.availableQuantity < resource.totalQuantity) {
          resource.availableQuantity = Number(resource.availableQuantity) + 1;
          await resource.save();
        }
      }
    } else if (status && status !== reservation.status) {
      reservation.status = status;
    }

    const updatedReservation = await reservation.save();

    res.status(200).json({
      success: true,
      message: 'Reservation updated successfully',
      data: updatedReservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Return a reserved resource
// @route   POST /api/reservations/:id/return
// @access  Public
const returnReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reservation = await findReservationByIdOrCustomId(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: `Reservation with ID '${id}' not found`
      });
    }

    if (reservation.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'This reservation is already returned.'
      });
    }

    reservation.status = 'returned';
    reservation.returnedAt = new Date();
    await reservation.save();

    // Increment resource available quantity
    const resource = await findResourceByIdOrCustomId(reservation.resourceId);
    if (resource) {
      if (resource.availableQuantity < resource.totalQuantity) {
        resource.availableQuantity = Number(resource.availableQuantity) + 1;
        await resource.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `${reservation.resourceName} returned successfully.`,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a reservation
// @route   DELETE /api/reservations/:id
// @access  Public
const deleteReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reservation = await findReservationByIdOrCustomId(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: `Reservation with ID '${id}' not found`
      });
    }

    // If reservation was active, restore available quantity
    if (reservation.status === 'active') {
      const resource = await findResourceByIdOrCustomId(reservation.resourceId);
      if (resource && resource.availableQuantity < resource.totalQuantity) {
        resource.availableQuantity = Number(resource.availableQuantity) + 1;
        await resource.save();
      }
    }

    await Reservation.findByIdAndDelete(reservation._id);

    res.status(200).json({
      success: true,
      message: 'Reservation deleted successfully',
      data: { id: reservation.customId || reservation._id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReservations,
  getReservationById,
  createReservation,
  updateReservation,
  returnReservation,
  deleteReservation
};
