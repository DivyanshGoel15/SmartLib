const express = require('express');
const router = express.Router();
const {
  getReservations,
  getReservationById,
  createReservation,
  updateReservation,
  returnReservation,
  deleteReservation
} = require('../controllers/reservationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// /api/reservations
router.route('/')
  .get(getReservations)
  .post(createReservation);

// /api/reservations/:id/return
router.post('/:id/return', returnReservation);

// /api/reservations/:id
router.route('/:id')
  .get(getReservationById)
  .put(updateReservation)
  .patch(updateReservation)
  .delete(deleteReservation);

module.exports = router;
