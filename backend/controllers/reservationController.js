const Reservation = require('../models/Reservation');
const Room = require('../models/Room');

// @desc    Create a new reservation
// @route   POST /api/reservations
// @access  Protected User
const createReservation = async (req, res, next) => {
  try {
    const { roomId, checkInDate, checkOutDate, guestCount } = req.body;

    if (!roomId || !checkInDate || !checkOutDate || !guestCount) {
      return res.status(400).json({
        message: 'Please provide roomId, checkInDate, checkOutDate, and guestCount'
      });
    }

    const newCheckIn = new Date(checkInDate);
    const newCheckOut = new Date(checkOutDate);

    // Validate dates
    if (isNaN(newCheckIn.getTime()) || isNaN(newCheckOut.getTime())) {
      return res.status(400).json({ message: 'Invalid check-in or check-out date' });
    }

    if (newCheckIn >= newCheckOut) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }

    // 1. Fetch Room and check Capacity & Availability Guards
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.isAvailable === false) {
      return res.status(400).json({ message: 'This room is currently marked as unavailable for booking' });
    }

    const guests = Number(guestCount);
    if (guests < 1) {
      return res.status(400).json({ message: 'Guest count must be at least 1' });
    }

    if (guests > room.maxCapacity) {
      return res.status(400).json({
        message: `Guest count (${guests}) exceeds maximum room capacity (${room.maxCapacity})`
      });
    }

    // 2. Date Collision Prevention:
    // Check existing reservations for target roomId where status == 'Confirmed'.
    // Reject with 400 Bad Request if (newCheckIn < existingCheckOut) && (newCheckOut > existingCheckIn)
    const confirmedReservations = await Reservation.find({
      roomId: room._id,
      status: 'Confirmed'
    });

    const hasCollision = confirmedReservations.some((existing) => {
      const existingCheckIn = new Date(existing.checkInDate);
      const existingCheckOut = new Date(existing.checkOutDate);
      return newCheckIn < existingCheckOut && newCheckOut > existingCheckIn;
    });

    if (hasCollision) {
      return res.status(400).json({
        message: 'The room is already booked for the selected dates. Please choose different dates.'
      });
    }

    // 3. Server-Side Pricing:
    // Calculate duration in days ((checkOutDate - checkInDate) / (1000 * 3600 * 24)).
    // Fetch authoritative pricePerNight from Room. Compute totalPrice = days * room.pricePerNight.
    // Client cannot override totalPrice.
    const diffTime = Math.abs(newCheckOut.getTime() - newCheckIn.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const finalDays = durationDays > 0 ? durationDays : 1;
    const authoritativePricePerNight = room.pricePerNight;
    const totalPrice = finalDays * authoritativePricePerNight;

    const reservation = await Reservation.create({
      userId: req.user._id,
      roomId: room._id,
      checkInDate: newCheckIn,
      checkOutDate: newCheckOut,
      guestCount: guests,
      totalPrice,
      status: 'Pending'
    });

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('roomId')
      .populate('userId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      reservation: populatedReservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reservations (regular user sees own; admin gets all)
// @route   GET /api/reservations
// @access  Protected
const getReservations = async (req, res, next) => {
  try {
    const filter = {};
    if (!req.user.isAdmin || req.query.myBookings === 'true') {
      filter.userId = req.user._id;
    }

    const reservations = await Reservation.find(filter)
      .populate('roomId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reservations.length,
      reservations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single reservation by ID
// @route   GET /api/reservations/:id
// @access  Protected
const getReservationById = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('roomId')
      .populate('userId', 'name email');

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Check ownership unless admin
    if (!req.user.isAdmin && reservation.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this reservation' });
    }

    res.json({
      success: true,
      reservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update reservation status (Confirm, Cancel, Pending)
// @route   PATCH /api/reservations/:id/status
// @access  Protected Admin
const updateReservationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Pending', 'Confirmed', 'Cancelled'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // If transitioning to Confirmed, check collision with other confirmed bookings
    if (status === 'Confirmed') {
      const newCheckIn = new Date(reservation.checkInDate);
      const newCheckOut = new Date(reservation.checkOutDate);

      const collision = await Reservation.findOne({
        _id: { $ne: reservation._id },
        roomId: reservation.roomId,
        status: 'Confirmed',
        checkInDate: { $lt: newCheckOut },
        checkOutDate: { $gt: newCheckIn }
      });

      if (collision) {
        return res.status(400).json({
          message: 'Cannot confirm reservation: Another confirmed reservation already exists for these dates.'
        });
      }
    }

    reservation.status = status;
    await reservation.save();

    const updated = await Reservation.findById(reservation._id)
      .populate('roomId')
      .populate('userId', 'name email');

    res.json({
      success: true,
      message: `Reservation status updated to ${status}`,
      reservation: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update/modify reservation details (dates, guest count)
// @route   PUT /api/reservations/:id
// @access  Protected (User owner or Admin)
const updateReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Must be admin or reservation owner
    if (!req.user.isAdmin && reservation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this reservation' });
    }

    if (reservation.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot modify a cancelled reservation' });
    }

    const { roomId, checkInDate, checkOutDate, guestCount } = req.body;

    const targetRoomId = roomId || reservation.roomId;
    const room = await Room.findById(targetRoomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.isAvailable === false && targetRoomId.toString() !== reservation.roomId.toString()) {
      return res.status(400).json({ message: 'This room is currently marked as unavailable for booking' });
    }

    const newCheckIn = checkInDate ? new Date(checkInDate) : new Date(reservation.checkInDate);
    const newCheckOut = checkOutDate ? new Date(checkOutDate) : new Date(reservation.checkOutDate);

    // Validate dates
    if (isNaN(newCheckIn.getTime()) || isNaN(newCheckOut.getTime())) {
      return res.status(400).json({ message: 'Invalid check-in or check-out date' });
    }

    if (newCheckIn >= newCheckOut) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }

    const guests = guestCount !== undefined ? Number(guestCount) : reservation.guestCount;
    if (guests < 1) {
      return res.status(400).json({ message: 'Guest count must be at least 1' });
    }

    if (guests > room.maxCapacity) {
      return res.status(400).json({
        message: `Guest count (${guests}) exceeds maximum room capacity (${room.maxCapacity})`
      });
    }

    // Date collision prevention:
    // Check confirmed reservations for target room excluding THIS reservation
    const confirmedReservations = await Reservation.find({
      _id: { $ne: reservation._id },
      roomId: room._id,
      status: 'Confirmed'
    });

    const hasCollision = confirmedReservations.some((existing) => {
      const existingCheckIn = new Date(existing.checkInDate);
      const existingCheckOut = new Date(existing.checkOutDate);
      return newCheckIn < existingCheckOut && newCheckOut > existingCheckIn;
    });

    if (hasCollision) {
      return res.status(400).json({
        message: 'The room is already booked for the selected dates. Please choose different dates.'
      });
    }

    // Authoritative Server-Side Pricing:
    const diffTime = Math.abs(newCheckOut.getTime() - newCheckIn.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const finalDays = durationDays > 0 ? durationDays : 1;
    const authoritativePricePerNight = room.pricePerNight;
    const totalPrice = finalDays * authoritativePricePerNight;

    reservation.roomId = room._id;
    reservation.checkInDate = newCheckIn;
    reservation.checkOutDate = newCheckOut;
    reservation.guestCount = guests;
    reservation.totalPrice = totalPrice;

    await reservation.save();

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('roomId')
      .populate('userId', 'name email');

    res.json({
      success: true,
      message: 'Reservation updated successfully',
      reservation: populatedReservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel or delete reservation
// @route   DELETE /api/reservations/:id
// @access  Protected User/Admin
const deleteReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Must be admin or reservation owner
    if (!req.user.isAdmin && reservation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this reservation' });
    }

    await Reservation.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Reservation cancelled/removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReservation,
  getReservations,
  getReservationById,
  updateReservation,
  updateReservationStatus,
  deleteReservation
};
