const fs = require('fs');
const path = require('path');
const Room = require('../models/Room');

// Helper to ensure every room has a valid luxury villa image
const resolveRoomImage = (img, roomType) => {
  if (img && typeof img === 'string' && img.trim() && !img.includes('room-')) {
    return img;
  }
  const type = (roomType || '').toLowerCase();
  if (type.includes('ocean')) return '/uploads/villa_ocean_suite.jpg';
  if (type.includes('standard') || type.includes('garden')) return '/uploads/standard_villa_suite.jpg';
  return '/uploads/deluxe_pool_villa.jpg';
};

// @desc    Create a new room (with image upload)
// @route   POST /api/rooms
// @access  Protected/Admin
const createRoom = async (req, res, next) => {
  try {
    const { roomNumber, roomType, pricePerNight, maxCapacity, isAvailable } = req.body;

    let roomImage = '';
    if (req.file) {
      if (req.file.buffer) {
        roomImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else if (req.file.filename) {
        roomImage = `/uploads/${req.file.filename}`;
      }
    } else if (req.body.roomImage) {
      roomImage = req.body.roomImage;
    }

    // If no image provided, assign appropriate luxury mock villa image
    if (!roomImage) {
      roomImage = resolveRoomImage('', roomType);
    }

    if (!roomNumber || !roomType || !pricePerNight || !maxCapacity) {
      return res.status(400).json({ message: 'Please provide roomNumber, roomType, pricePerNight, and maxCapacity' });
    }

    // Parse amenities if sent as string or array
    let parsedAmenities = [];
    if (req.body.amenities) {
      if (Array.isArray(req.body.amenities)) {
        parsedAmenities = req.body.amenities;
      } else if (typeof req.body.amenities === 'string') {
        try {
          const parsed = JSON.parse(req.body.amenities);
          parsedAmenities = Array.isArray(parsed) ? parsed : [req.body.amenities];
        } catch (e) {
          parsedAmenities = req.body.amenities.split(',').map(a => a.trim()).filter(Boolean);
        }
      }
    }

    // Check if room number already exists
    const existing = await Room.findOne({ roomNumber: roomNumber.trim() });
    if (existing) {
      return res.status(400).json({ message: `Room number ${roomNumber} already exists` });
    }

    const room = await Room.create({
      roomNumber: roomNumber.trim(),
      roomType,
      pricePerNight: Number(pricePerNight),
      maxCapacity: Number(maxCapacity),
      amenities: parsedAmenities,
      roomImage,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable === 'true' || isAvailable === true) : true
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    // If a file was uploaded but creation failed, clean it up
    if (req.file && req.file.filename) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }
    next(error);
  }
};

// @desc    Get all rooms with optional filtering
// @route   GET /api/rooms
// @access  Public
const getRooms = async (req, res, next) => {
  try {
    const { roomType, isAvailable, minCapacity, search } = req.query;

    const filter = {};

    if (roomType) {
      filter.roomType = roomType;
    }

    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true';
    }

    if (minCapacity) {
      filter.maxCapacity = { $gte: Number(minCapacity) };
    }

    if (search) {
      filter.$or = [
        { roomNumber: { $regex: search, $options: 'i' } },
        { roomType: { $regex: search, $options: 'i' } }
      ];
    }

    const rooms = await Room.find(filter).sort({ createdAt: -1 });

    const sanitizedRooms = rooms.map(r => {
      const obj = r.toObject ? r.toObject() : { ...r };
      obj.roomImage = resolveRoomImage(obj.roomImage, obj.roomType);
      return obj;
    });

    res.json({
      success: true,
      count: sanitizedRooms.length,
      rooms: sanitizedRooms
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single room by ID
// @route   GET /api/rooms/:id
// @access  Public
const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const roomObj = room.toObject ? room.toObject() : { ...room };
    roomObj.roomImage = resolveRoomImage(roomObj.roomImage, roomObj.roomType);

    res.json({
      success: true,
      room: roomObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update room details or toggle availability
// @route   PUT /api/rooms/:id
// @access  Protected/Admin
const updateRoom = async (req, res, next) => {
  try {
    let room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const { roomNumber, roomType, pricePerNight, maxCapacity, isAvailable } = req.body;

    if (roomNumber && roomNumber !== room.roomNumber) {
      const existing = await Room.findOne({ roomNumber: roomNumber.trim(), _id: { $ne: room._id } });
      if (existing) {
        return res.status(400).json({ message: `Room number ${roomNumber} is already taken` });
      }
      room.roomNumber = roomNumber.trim();
    }

    if (roomType) room.roomType = roomType;
    if (pricePerNight !== undefined) room.pricePerNight = Number(pricePerNight);
    if (maxCapacity !== undefined) room.maxCapacity = Number(maxCapacity);
    if (isAvailable !== undefined) {
      room.isAvailable = Boolean(isAvailable === 'true' || isAvailable === true);
    }

    if (req.body.amenities !== undefined) {
      if (Array.isArray(req.body.amenities)) {
        room.amenities = req.body.amenities;
      } else if (typeof req.body.amenities === 'string') {
        try {
          const parsed = JSON.parse(req.body.amenities);
          room.amenities = Array.isArray(parsed) ? parsed : [req.body.amenities];
        } catch (e) {
          room.amenities = req.body.amenities.split(',').map(a => a.trim()).filter(Boolean);
        }
      }
    }

    if (req.file) {
      if (req.file.buffer) {
        room.roomImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else if (req.file.filename) {
        // If updating with a new file, remove the old file if it was locally stored
        if (room.roomImage && room.roomImage.startsWith('/uploads/')) {
          const oldFile = path.join(__dirname, '..', room.roomImage);
          if (fs.existsSync(oldFile)) {
            try { fs.unlinkSync(oldFile); } catch (e) {}
          }
        }
        room.roomImage = `/uploads/${req.file.filename}`;
      }
    } else if (req.body.roomImage) {
      room.roomImage = req.body.roomImage;
    }

    const updatedRoom = await room.save();

    res.json({
      success: true,
      message: 'Room updated successfully',
      room: updatedRoom
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Protected/Admin
const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Clean up local image if applicable
    if (room.roomImage && room.roomImage.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', room.roomImage);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    await Room.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom
};
