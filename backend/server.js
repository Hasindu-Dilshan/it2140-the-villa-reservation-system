const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables reliably from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Enable CORS for all origins, headers, and standard HTTP methods
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check / Root route (responds even before DB connection)
app.get('/', (req, res) => {
  res.json({
    name: 'The Villa Hotel Room Reservation System API',
    status: 'online',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    serverless: Boolean(process.env.VERCEL),
  });
});

// Serverless-safe Database Connection Middleware
// Ensures every incoming API request has an active, cached MongoDB connection
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database Connection Error in request middleware:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed. Please ensure MONGODB_URI is correctly configured.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Database Seed Helper Endpoint (useful when deploying to cloud with an empty database)
app.get('/api/seed', async (req, res, next) => {
  try {
    const Room = require('./models/Room');
    const roomCount = await Room.countDocuments();
    if (roomCount > 0) {
      return res.json({
        success: true,
        message: 'Database is already populated with rooms.',
        count: roomCount,
      });
    }

    const User = require('./models/User');
    await User.create({
      name: 'The Villa Concierge (Admin)',
      email: 'admin@thevilla.com',
      password: 'password123',
      isAdmin: true,
    });
    await User.create({
      name: 'Elena Rostova',
      email: 'guest@thevilla.com',
      password: 'password123',
      isAdmin: false,
    });
    const seededRooms = await Room.insertMany([
      {
        roomNumber: 'V-101',
        roomType: 'Ocean View Suite',
        pricePerNight: 550,
        maxCapacity: 2,
        amenities: ['Panoramic Ocean View', 'Private Balcony', 'King Plush Bed', 'High-Speed Wi-Fi', 'Complimentary Breakfast'],
        roomImage: '/uploads/villa_ocean_suite.jpg',
        isAvailable: true,
      },
      {
        roomNumber: 'V-202',
        roomType: 'Deluxe Pool Villa',
        pricePerNight: 780,
        maxCapacity: 4,
        amenities: ['Private Infinity Pool', 'Sun Deck', 'Rainfall Shower', 'Two King Beds', 'Butler Service'],
        roomImage: '/uploads/deluxe_pool_villa.jpg',
        isAvailable: true,
      },
      {
        roomNumber: 'V-303',
        roomType: 'Standard Villa',
        pricePerNight: 320,
        maxCapacity: 2,
        amenities: ['Garden View', 'Queen Bed', 'Rainfall Shower', 'High-Speed Wi-Fi', 'Smart TV'],
        roomImage: '/uploads/standard_villa_suite.jpg',
        isAvailable: true,
      },
    ]);

    res.json({
      success: true,
      message: 'Database auto-seeded successfully with demo accounts and luxury villas.',
      rooms: seededRooms,
    });
  } catch (error) {
    next(error);
  }
});

// Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);

// Error Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Connect to Database and start server for traditional execution (e.g. node server.js or local testing)
const startServer = async (customPort) => {
  try {
    await connectDB();

    // Auto-seed initial rooms if empty on local startup
    const Room = require('./models/Room');
    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      console.log('Database has no rooms. Initializing default rooms & demo users...');
      const User = require('./models/User');
      await User.create({
        name: 'The Villa Concierge (Admin)',
        email: 'admin@thevilla.com',
        password: 'password123',
        isAdmin: true,
      });
      await User.create({
        name: 'Elena Rostova',
        email: 'guest@thevilla.com',
        password: 'password123',
        isAdmin: false,
      });
      await Room.insertMany([
        {
          roomNumber: 'V-101',
          roomType: 'Ocean View Suite',
          pricePerNight: 550,
          maxCapacity: 2,
          amenities: ['Panoramic Ocean View', 'Private Balcony', 'King Plush Bed', 'High-Speed Wi-Fi', 'Complimentary Breakfast'],
          roomImage: '/uploads/villa_ocean_suite.jpg',
          isAvailable: true,
        },
        {
          roomNumber: 'V-202',
          roomType: 'Deluxe Pool Villa',
          pricePerNight: 780,
          maxCapacity: 4,
          amenities: ['Private Infinity Pool', 'Sun Deck', 'Rainfall Shower', 'Two King Beds', 'Butler Service'],
          roomImage: '/uploads/deluxe_pool_villa.jpg',
          isAvailable: true,
        },
        {
          roomNumber: 'V-303',
          roomType: 'Standard Villa',
          pricePerNight: 320,
          maxCapacity: 2,
          amenities: ['Garden View', 'Queen Bed', 'Rainfall Shower', 'High-Speed Wi-Fi', 'Smart TV'],
          roomImage: '/uploads/standard_villa_suite.jpg',
          isAvailable: true,
        },
      ]);
      console.log('Default data auto-seeded successfully.');
    }

    const port = customPort || process.env.PORT || 5001;
    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        const actualPort = server.address().port;
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${actualPort}`);
        resolve(server);
      });
      server.on('error', reject);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

// Export app directly for Vercel Serverless Function, while preserving startServer for local tests
module.exports = app;
module.exports.app = app;
module.exports.startServer = startServer;
