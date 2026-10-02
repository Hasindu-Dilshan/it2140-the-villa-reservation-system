const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Please provide a room number'],
      unique: true,
      trim: true
    },
    roomType: {
      type: String,
      required: [true, 'Please specify the room type'],
      enum: {
        values: ['Standard Villa', 'Deluxe Pool Villa', 'Ocean View Suite'],
        message: '{VALUE} is not a supported room type'
      }
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Please provide the price per night'],
      min: [0, 'Price per night cannot be negative']
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Please provide maximum capacity'],
      min: [1, 'Capacity must be at least 1 guest']
    },
    amenities: {
      type: [String],
      default: []
    },
    roomImage: {
      type: String,
      required: [true, 'Please provide a room image']
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Room', roomSchema);
