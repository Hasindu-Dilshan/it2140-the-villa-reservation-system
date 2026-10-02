const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(getRooms)
  .post(protect, admin, upload.single('roomImage'), createRoom);

router.route('/:id')
  .get(getRoomById)
  .put(protect, admin, upload.single('roomImage'), updateRoom)
  .delete(protect, admin, deleteRoom);

module.exports = router;
