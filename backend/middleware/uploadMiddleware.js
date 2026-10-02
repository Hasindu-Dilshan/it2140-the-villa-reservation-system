const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if running in a serverless environment (Vercel)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

let storage;

if (isServerless) {
  // Use memory storage in serverless environments (read-only filesystem)
  storage = multer.memoryStorage();
} else {
  // Ensure local uploads folder exists for traditional local execution
  const uploadDir = path.join(__dirname, '..', 'uploads');
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `room-${uniqueSuffix}${ext}`);
      }
    });
  } catch (err) {
    console.warn('Could not initialize disk storage directory, falling back to memory storage:', err.message);
    storage = multer.memoryStorage();
  }
}

// File filter for image types
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedExtensions.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    return cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed!'), false);
  }
};

// Multer upload instance with 5MB limit
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  },
  fileFilter: fileFilter
});

module.exports = upload;
