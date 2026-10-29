const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Resource = require('../models/Resource');
const { findResourceByIdOrCustomId } = require('./resourceController');

const isAdministrator = user => ['library_admin', 'admin'].includes(String(user.role || '').toLowerCase());
const isOwner = (reservation, user) => String(reservation.userId) === String(user._id);

const findReservationByIdOrCustomId = async id => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const reservation = await Reservation.findById(id);
    if (reservation) return reservation;
  }
  return Reservation.findOne({ customId: id });
};

const findAuthorizedReservation = async (id, user) => {
  const reservation = await findReservationByIdOrCustomId(id);
  if (!reservation || (!isAdministrator(user) && !isOwner(reservation, user))) {
    return null;
  }
  return reservation;
};

const restoreResourceInventory = async reservation => {
  const resource = reservation.resource
    ? await Resource.findById(reservation.resource)
    : await findResourceByIdOrCustomId(reservation.resourceId);
  if (!resource) {
    throw new Error('Reservation inventory could not be restored because its resource no longer exists.');
  }

  const restoredResource = await Resource.findOneAndUpdate(
    { _id: resource._id, availableQuantity: { $lt: resource.totalQuantity } },
    { $inc: { availableQuantity: 1 } },
    { new: true, runValidators: true }
  );
  if (!restoredResource) {
    throw new Error('Reservation inventory could not be restored; resource quantities require reconciliation.');
  }
};

const getReservations = async (req, res, next) => {
  try {
    const { userId, status, resourceId } = req.query;
    const filter = {};

    if (!isAdministrator(req.user)) {
      filter.userId = String(req.user._id);
    } else if (userId) {
      filter.userId = String(userId);
    }

    if (status) filter.status = status;
    if (resourceId) filter.resourceId = String(resourceId);

    const reservations = await Reservation.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations
    });
  } catch (error) {
    return next(error);
  }
};

const getReservationById = async (req, res, next) => {
  try {
    const reservation = await findAuthorizedReservation(req.params.id, req.user);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found.'
      });
    }

    return res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    return next(error);
  }
};

const createReservation = async (req, res, next) => {
  try {
    if (!['student', 'faculty'].includes(String(req.user.role || '').toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: 'Only students and faculty can create reservations.'
      });
    }

    const { resourceId, customId } = req.body;
    if (!resourceId) {
      return res.status(400).json({ success: false, message: 'Resource ID is required.' });
    }

    const resource = await findResourceByIdOrCustomId(String(resourceId));
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    const userId = String(req.user._id);
    const normalizedResourceId = String(resource.customId || resource._id);
    const existingReservation = await Reservation.findOne({
      userId,
      resourceId: normalizedResourceId,
      status: 'active'
    });
    if (existingReservation) {
      return res.status(409).json({
        success: false,
        message: 'You already have this resource reserved.'
      });
    }

    const activeCount = await Reservation.countDocuments({ userId, status: 'active' });
    if (activeCount >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 2 active resource reservations allowed.'
      });
    }

    const reservation = new Reservation({
      customId,
      resourceId: normalizedResourceId,
      resource: resource._id,
      resourceName: resource.name,
      userId,
      userName: req.user.name,
      userEmail: req.user.email || '',
      department: req.user.department || '',
      year: req.user.year || '',
      userRole: req.user.role,
      reservedAt: new Date(),
      status: 'active',
      promotedFromQueue: false
    });

    const savedReservation = await reservation.save();
    const claimedResource = await Resource.findOneAndUpdate(
      { _id: resource._id, availableQuantity: { $gt: 0 } },
      { $inc: { availableQuantity: -1 } },
      { new: true, runValidators: true }
    );

    if (!claimedResource) {
      await Reservation.deleteOne({ _id: savedReservation._id });
      return res.status(409).json({
        success: false,
        message: `Resource '${resource.name}' is currently unavailable.`
      });
    }

    return res.status(201).json({
      success: true,
      message: `${resource.name} reserved successfully.`,
      data: savedReservation
    });
  } catch (error) {
    return next(error);
  }
};

const transitionReservation = async (req, res, next, targetStatus) => {
  try {
    const reservation = await findAuthorizedReservation(req.params.id, req.user);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }
    if (reservation.status !== 'active') {
      return res.status(409).json({
        success: false,
        message: reservation.status === 'returned'
          ? 'This reservation is already returned.'
          : 'This reservation is no longer active.'
      });
    }

    const returnedAt = targetStatus === 'returned' ? new Date() : null;
    const updatedReservation = await Reservation.findOneAndUpdate(
      { _id: reservation._id, status: 'active' },
      { $set: { status: targetStatus, returnedAt } },
      { new: true, runValidators: true }
    );
    if (!updatedReservation) {
      return res.status(409).json({
        success: false,
        message: 'Reservation status changed. Refresh and try again.'
      });
    }

    await restoreResourceInventory(updatedReservation);

    return res.status(200).json({
      success: true,
      message: targetStatus === 'returned'
        ? `${updatedReservation.resourceName} returned successfully.`
        : 'Reservation cancelled successfully.',
      data: updatedReservation
    });
  } catch (error) {
    return next(error);
  }
};

const updateReservation = async (req, res, next) => {
  const { status } = req.body;
  if (!['returned', 'cancelled'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Reservation updates may only return or cancel an active reservation.'
    });
  }
  return transitionReservation(req, res, next, status);
};

const returnReservation = (req, res, next) =>
  transitionReservation(req, res, next, 'returned');

const deleteReservation = async (req, res, next) => {
  try {
    const reservation = await findAuthorizedReservation(req.params.id, req.user);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }
    if (reservation.status === 'active') {
      return res.status(409).json({
        success: false,
        message: 'Return or cancel an active reservation before deleting it.'
      });
    }

    await Reservation.deleteOne({ _id: reservation._id, status: reservation.status });
    return res.status(200).json({
      success: true,
      message: 'Reservation deleted successfully.',
      data: { id: reservation.customId || reservation._id }
    });
  } catch (error) {
    return next(error);
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
