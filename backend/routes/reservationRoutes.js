const express = require('express');
const router = express.Router();
const {
  createReservation,
  getReservations,
  getReservationById,
  updateReservation,
  updateReservationStatus,
  deleteReservation
} = require('../controllers/reservationController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createReservation)
  .get(protect, getReservations);

router.route('/:id')
  .get(protect, getReservationById)
  .put(protect, updateReservation)
  .patch(protect, updateReservation)
  .delete(protect, deleteReservation);

router.route('/:id/status')
  .patch(protect, admin, updateReservationStatus);

module.exports = router;
