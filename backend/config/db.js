const path = require('path');
const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
  } catch (e) {
    // Ignore error if .env file is missing (e.g. in cloud production)
  }
}

/**
 * Global cache for MongoDB connection across serverless invocations.
 * This prevents creating new connections on every request in Vercel.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

let mongoMemoryServer = null;

const connectDB = async () => {
  // If already connected, return cached connection immediately
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const mongoUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();

  if (mongoUri) {
    if (!cached.promise) {
      console.log(`Connecting to MongoDB Atlas...`);
      cached.promise = mongoose
        .connect(mongoUri, {
          bufferCommands: false,
        })
        .then((mongooseInstance) => {
          console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
          return mongooseInstance;
        });
    }

    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (err) {
      cached.promise = null;
      console.error(`MongoDB Connection Error: ${err.message}`);
      throw err;
    }
  }

  // If on Vercel and no URI provided, fail with a clear, helpful message
  if (process.env.VERCEL) {
    throw new Error(
      'MONGODB_URI environment variable is missing on Vercel. Please set it in your Vercel Project Settings.'
    );
  }

  // Local fallback: In-memory MongoDB server for testing & zero-config local dev
  if (!cached.promise) {
    console.log('No MONGODB_URI provided. Initializing in-memory MongoDB server for seamless local testing...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create();
    const uri = mongoMemoryServer.getUri();
    cached.promise = mongoose.connect(uri).then((mongooseInstance) => {
      console.log(`In-memory MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

const disconnectDB = async () => {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
};

module.exports = { connectDB, disconnectDB };
