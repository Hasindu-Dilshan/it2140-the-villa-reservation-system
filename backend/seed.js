const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');
const Room = require('./models/Room');
const Reservation = require('./models/Reservation');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Seeding initial data for The Villa...');

    // 1. Clear existing data
    await User.deleteMany({});
    await Room.deleteMany({});
    await Reservation.deleteMany({});

    // 2. Create Admin and Guest users
    const adminUser = await User.create({
      name: 'The Villa Concierge (Admin)',
      email: 'admin@thevilla.com',
      password: 'password123',
      isAdmin: true
    });

    const guestUser = await User.create({
      name: 'Elena Rostova',
      email: 'guest@thevilla.com',
      password: 'password123',
      isAdmin: false
    });

    console.log(`Created Admin: ${adminUser.email} & Guest: ${guestUser.email}`);

    // 3. Create Rooms
    const rooms = await Room.insertMany([
      {
        roomNumber: 'V-101',
        roomType: 'Ocean View Suite',
        pricePerNight: 550,
        maxCapacity: 2,
        amenities: [
          'Panoramic Ocean View',
          'Private Balcony & Sunbed',
          'King Plush Bed',
          'High-Speed Wi-Fi',
          'Complimentary Gourmet Breakfast',
          'Mini-Bar & Espresso Bar'
        ],
        roomImage: '/uploads/villa_ocean_suite.jpg',
        isAvailable: true
      },
      {
        roomNumber: 'V-202',
        roomType: 'Deluxe Pool Villa',
        pricePerNight: 780,
        maxCapacity: 4,
        amenities: [
          'Private Infinity Edge Pool',
          'Tropical Garden & Sun Deck',
          'Outdoor Rainfall Shower',
          'Two Master King Bedrooms',
          'Dedicated Butler Service',
          'Whirlpool Jacuzzi'
        ],
        roomImage: '/uploads/deluxe_pool_villa.jpg',
        isAvailable: true
      },
      {
        roomNumber: 'V-303',
        roomType: 'Standard Villa',
        pricePerNight: 320,
        maxCapacity: 2,
        amenities: [
          'Lush Botanical Garden View',
          'Queen Plush Pillowtop Bed',
          'Rainfall Shower',
          'Organic Toiletries',
          'High-Speed Wi-Fi',
          '4K Smart TV'
        ],
        roomImage: '/uploads/standard_villa_suite.jpg',
        isAvailable: true
      }
    ]);

    console.log(`Created ${rooms.length} luxury rooms.`);

    // 4. Create an initial reservation for guest
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 7);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 3);

    const reservation = await Reservation.create({
      userId: guestUser._id,
      roomId: rooms[0]._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestCount: 2,
      totalPrice: 3 * rooms[0].pricePerNight, // 3 nights * $550 = $1650
      status: 'Confirmed'
    });

    console.log(`Created sample reservation for Room ${rooms[0].roomNumber}: $${reservation.totalPrice} (Confirmed)`);
    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    if (require.main === module) {
      await disconnectDB();
      process.exit();
    }
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
