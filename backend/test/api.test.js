const { startServer } = require('../server');
const { disconnectDB } = require('../config/db');
const fs = require('fs');
const path = require('path');

const PORT = 5099;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('--- STARTING BACKEND INTEGRATION & BUSINESS LOGIC TESTS ---');
  let server;

  try {
    server = await startServer(PORT);
    const actualPort = server.address().port;
    const BASE_URL = `http://127.0.0.1:${actualPort}`;
    console.log('Backend test server started on', BASE_URL);

    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/`);
    assert(healthRes.status === 200, 'Health check returns status 200');

    const ts = Date.now();
    const adminEmail = `manager_${ts}@thevilla.com`;
    const guestEmail = `alice_${ts}@example.com`;
    const testRoomNumber = `V-${ts.toString().slice(-4)}`;

    // 2. Auth: Register Admin
    const adminRegisterRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'The Villa Manager',
        email: adminEmail,
        password: 'password123',
        isAdmin: true
      })
    });
    const adminData = await adminRegisterRes.json();
    assert(adminRegisterRes.status === 201, 'Admin user registered successfully');
    assert(adminData.user.isAdmin === true, 'Admin user has isAdmin: true');
    const adminToken = adminData.token;

    // 3. Auth: Register Guest
    const guestRegisterRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Guest',
        email: guestEmail,
        password: 'password123',
        isAdmin: false
      })
    });
    const guestData = await guestRegisterRes.json();
    assert(guestRegisterRes.status === 201, 'Guest user registered successfully');
    assert(guestData.user.isAdmin === false, 'Guest user has isAdmin: false');
    const guestToken = guestData.token;

    // 4. Auth: Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: guestEmail,
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Guest login returns status 200 and token');

    // 5. Auth: GET /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${guestToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /api/auth/me returns guest profile');
    assert(meData.user.email === guestEmail, 'Profile email matches');

    // 6. Security: Non-admin room creation should be forbidden (403)
    const unauthorizedRoomRes = await fetch(`${BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${guestToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomNumber: 'V-999',
        roomType: 'Standard Villa',
        pricePerNight: 250,
        maxCapacity: 2,
        roomImage: '/uploads/sample.jpg'
      })
    });
    assert(unauthorizedRoomRes.status === 403, 'Non-admin room creation blocked with 403 Forbidden');

    // 7. Admin Room Creation (Multipart with image)
    const formData = new FormData();
    formData.append('roomNumber', testRoomNumber);
    formData.append('roomType', 'Deluxe Pool Villa');
    formData.append('pricePerNight', '450');
    formData.append('maxCapacity', '4');
    formData.append('amenities', JSON.stringify(['Private Infinity Pool', 'Ocean View', 'King Bed', 'Complimentary Breakfast']));

    const sampleImagePath = path.join(__dirname, 'sample_room.jpg');
    const fileBlob = new Blob([fs.readFileSync(sampleImagePath)], { type: 'image/jpeg' });
    formData.append('roomImage', fileBlob, 'sample_room.jpg');

    const createRoomRes = await fetch(`${BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      body: formData
    });
    const createRoomData = await createRoomRes.json();
    assert(createRoomRes.status === 201, 'Admin created room successfully with image upload');
    const createdRoom = createRoomData.room;
    assert(createdRoom.roomNumber === testRoomNumber, `Room number is ${testRoomNumber}`);
    assert(createdRoom.roomImage.includes('/uploads/'), 'Room image path is correctly set');

    // 8. Public Room Listing
    const getRoomsRes = await fetch(`${BASE_URL}/api/rooms`);
    const roomsData = await getRoomsRes.json();
    assert(getRoomsRes.status === 200, 'GET /api/rooms is publicly accessible');
    assert(roomsData.rooms.length > 0, 'Rooms list contains created room');

    // 9. Public Room Details
    const getRoomRes = await fetch(`${BASE_URL}/api/rooms/${createdRoom._id}`);
    const singleRoomData = await getRoomRes.json();
    assert(getRoomRes.status === 200, 'GET /api/rooms/:id returns single room');
    assert(singleRoomData.room.roomNumber === testRoomNumber, 'Room ID lookup returned correct room');

    // 10. Business Logic Guard: Capacity Guard check
    const overCapacityRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        roomId: createdRoom._id,
        checkInDate: '2026-10-01',
        checkOutDate: '2026-10-05',
        guestCount: 10 // exceeds maxCapacity (4)
      })
    });
    assert(overCapacityRes.status === 400, 'Booking exceeding maxCapacity rejected with 400');

    // 11. Business Logic: Server-Side Pricing Calculation
    // 4 nights at $450/night = $1800
    const createBookingRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        roomId: createdRoom._id,
        checkInDate: '2026-10-01',
        checkOutDate: '2026-10-05',
        guestCount: 2,
        totalPrice: 10 // Attempted client-specified price must be overridden!
      })
    });
    const bookingData = await createBookingRes.json();
    assert(createBookingRes.status === 201, 'Booking 1 created successfully');
    const booking1 = bookingData.reservation;
    assert(booking1.totalPrice === 1800, `Authoritative server totalPrice is $1800 (got $${booking1.totalPrice})`);
    assert(booking1.status === 'Pending', 'Initial booking status is Pending');

    // 12. Admin Confirms Booking 1
    const confirmRes = await fetch(`${BASE_URL}/api/reservations/${booking1._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Confirmed' })
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.status === 200, 'Admin confirmed booking 1');
    assert(confirmData.reservation.status === 'Confirmed', 'Status successfully transitioned to Confirmed');

    // 13. Business Logic Guard: Date Collision Prevention
    // Booking dates: 2026-10-03 to 2026-10-07 (Overlaps with 2026-10-01 to 2026-10-05)
    // Formula: (newCheckIn < existingCheckOut) && (newCheckOut > existingCheckIn)
    // 2026-10-03 < 2026-10-05 AND 2026-10-07 > 2026-10-01 -> TRUE! Must reject!
    const overlappingBookingRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        roomId: createdRoom._id,
        checkInDate: '2026-10-03',
        checkOutDate: '2026-10-07',
        guestCount: 2
      })
    });
    assert(overlappingBookingRes.status === 400, 'Overlapping booking collision correctly rejected with 400 Bad Request');
    const overlapData = await overlappingBookingRes.json();
    console.log('Collision rejection message:', overlapData.message);

    // 14. Non-overlapping Booking should succeed
    // Dates: 2026-10-05 to 2026-10-08 (Check-in on day of check-out is standard hotel practice, no overlap)
    const nonOverlapRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        roomId: createdRoom._id,
        checkInDate: '2026-10-05',
        checkOutDate: '2026-10-08',
        guestCount: 2
      })
    });
    assert(nonOverlapRes.status === 201, 'Non-overlapping booking (check-in on previous check-out) succeeded');
    const booking2Data = await nonOverlapRes.json();
    const booking2 = booking2Data.reservation;

    // 14b. Guest updates their reservation (modify stay dates & guest count)
    // 4 nights: 2026-10-06 to 2026-10-10 at $450/night = $1800, 3 guests
    const updateRes = await fetch(`${BASE_URL}/api/reservations/${booking2._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        roomId: createdRoom._id,
        checkInDate: '2026-10-06',
        checkOutDate: '2026-10-10',
        guestCount: 3
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Guest updated reservation successfully');
    assert(updateData.reservation.guestCount === 3, 'Updated guest count is 3');
    assert(updateData.reservation.totalPrice === 1800, 'Recalculated totalPrice is authoritative $1800');

    // 14c. Update with Date Collision Guard (collides with Confirmed booking 1: 2026-10-01 to 2026-10-05)
    const collisionUpdateRes = await fetch(`${BASE_URL}/api/reservations/${booking2._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        checkInDate: '2026-10-02',
        checkOutDate: '2026-10-04'
      })
    });
    assert(collisionUpdateRes.status === 400, 'Update with collision rejected with 400 Bad Request');

    // 14d. Update with Capacity Guard
    const capacityUpdateRes = await fetch(`${BASE_URL}/api/reservations/${booking2._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        guestCount: 20
      })
    });
    assert(capacityUpdateRes.status === 400, 'Update exceeding room maxCapacity rejected with 400');

    // 15. View Reservations
    const guestReservationsRes = await fetch(`${BASE_URL}/api/reservations`, {
      headers: { Authorization: `Bearer ${guestToken}` }
    });
    const guestReservations = await guestReservationsRes.json();
    assert(guestReservationsRes.status === 200, 'User can view own reservations');
    assert(guestReservations.reservations.length === 2, 'Guest has 2 reservations');

    // 16. Cancellation of Reservation
    const cancelRes = await fetch(`${BASE_URL}/api/reservations/${booking1._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${guestToken}` }
    });
    assert(cancelRes.status === 200, 'Reservation cancelled/removed successfully');

    // 17. Cleanup test entities to maintain database cleanliness
    try {
      const Room = require('../models/Room');
      const User = require('../models/User');
      const Reservation = require('../models/Reservation');

      if (createdRoom && createdRoom._id) {
        await Room.findByIdAndDelete(createdRoom._id);
      }
      if (booking2 && booking2._id) {
        await Reservation.findByIdAndDelete(booking2._id);
      }
      await User.deleteMany({ email: { $in: [adminEmail, guestEmail] } });
      console.log('✅ Cleaned up test rooms, reservations, and test users');
    } catch (cleanupErr) {
      console.warn('Test cleanup warning:', cleanupErr.message);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL BACKEND API & BUSINESS LOGIC TESTS PASSED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit();
  }
}

runTests();
