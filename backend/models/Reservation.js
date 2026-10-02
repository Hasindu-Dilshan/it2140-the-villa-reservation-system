const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reservation must belong to a user']
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Reservation must be for a room']
    },
    checkInDate: {
      type: Date,
      required: [true, 'Please provide a check-in date']
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Please provide a check-out date']
    },
    guestCount: {
      type: Number,
      required: [true, 'Please specify the number of guests'],
      min: [1, 'Guest count must be at least 1']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required']
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Confirmed', 'Cancelled'],
        message: '{VALUE} is not a valid status'
      },
      default: 'Pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);
