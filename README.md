# The Villa — Hotel Room Reservation System

A complete full-stack mobile application for luxury hotel reservations, built with **Node.js, Express.js, MongoDB (Mongoose)** on the backend and **React Native (Expo)** on the mobile client.

---

## 1. Project Architecture & Repository Layout

```
assignment/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & zero-config fallback
│   ├── controllers/
│   │   ├── authController.js     # Auth, register, login, profile
│   │   ├── roomController.js     # Primary Entity CRUD & Multer uploads
│   │   └── reservationController.js # Related Entity CRUD & Business Logic
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & Admin guards
│   │   ├── uploadMiddleware.js   # Multer image storage & type/size validator
│   │   └── errorMiddleware.js    # Not found & unified exception handler
│   ├── models/
│   │   ├── User.js               # User schema (name, email, password, isAdmin)
│   │   ├── Room.js               # Room schema (Primary Entity)
│   │   └── Reservation.js        # Reservation schema (Related Entity)
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── roomRoutes.js
│   │   └── reservationRoutes.js
│   ├── uploads/                  # Static directory for uploaded villa imagery
│   ├── test/
│   │   └── api.test.js           # Automated end-to-end integration test suite
│   ├── seed.js                   # Seed script for luxury villas & demo accounts
│   ├── server.js                 # Express server entry point
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js         # Axios instance, Bearer interceptor & host switcher
    │   ├── context/
    │   │   └── AuthContext.js    # Global auth state, session restore, role flags
    │   ├── navigation/
    │   │   └── AppNavigator.js   # Native Stack Navigator (Auth & App Stacks)
    │   ├── screens/
    │   │   ├── auth/
    │   │   │   ├── LoginScreen.js
    │   │   │   └── RegisterScreen.js
    │   │   ├── rooms/
    │   │   │   ├── RoomListScreen.js
    │   │   │   └── RoomDetailScreen.js
    │   │   ├── reservations/
    │   │   │   ├── CreateReservationScreen.js
    │   │   │   ├── EditReservationScreen.js
    │   │   │   └── MyBookingsScreen.js
    │   │   └── admin/
    │   │       ├── AdminManageRoomsScreen.js
    │   │       └── AdminReservationsScreen.js
    │   ├── components/
    │   │   ├── HeaderBanner.js
    │   │   ├── RoomCard.js
    │   │   ├── StatusBadge.js
    │   │   └── EmptyState.js
    │   └── theme/
    │       └── colors.js         # Luxury resort color palette & typography
    ├── App.js
    ├── app.json
    └── package.json
```

---

## 2. Entities & Schemas

### Exactly Two Entities Beyond User:
1. **Primary Entity: `Room`**
   - `roomNumber`: String, required, unique
   - `roomType`: String, enum: `['Standard Villa', 'Deluxe Pool Villa', 'Ocean View Suite']`, required
   - `pricePerNight`: Number, required, min: 0
   - `maxCapacity`: Number, required, min: 1
   - `amenities`: [String]
   - `roomImage`: String, required (stored file path)
   - `isAvailable`: Boolean, default: true

2. **Related Entity: `Reservation`**
   - `userId`: ObjectId ref `'User'`, required
   - `roomId`: ObjectId ref `'Room'`, required
   - `checkInDate`: Date, required
   - `checkOutDate`: Date, required
   - `guestCount`: Number, required, min: 1
   - `totalPrice`: Number, required (calculated server-side)
   - `status`: String, enum: `['Pending', 'Confirmed', 'Cancelled']`, default: `'Pending'`
   - `createdAt`: Date, default: Date.now

---

## 3. Server-Side Enforced Business Logic

Implemented in [`backend/controllers/reservationController.js`](file:///Users/hasindu/Desktop/wmt%20se2020/assignment/assignment/backend/controllers/reservationController.js):

1. **Date Collision Prevention**:
   Checks existing reservations for the target `roomId` where `status == 'Confirmed'`.
   Rejects with `400 Bad Request` if:
   ```javascript
   (newCheckIn < existingCheckOut) && (newCheckOut > existingCheckIn)
   ```
2. **Server-Side Authoritative Pricing**:
   Calculates duration in days:
   ```javascript
   durationDays = Math.ceil((checkOutDate - checkInDate) / (1000 * 3600 * 24))
   ```
   Fetches authoritative `pricePerNight` from the Room document. Computes `totalPrice = durationDays * room.pricePerNight`. Client input cannot alter this value.
3. **Capacity & Availability Guards**:
   - Rejects with `400 Bad Request` if `Room.isAvailable === false`.
   - Rejects with `400 Bad Request` if `guestCount > Room.maxCapacity` or `guestCount < 1`.

---

## 4. Quick Start & Execution

### A. Run Backend Tests
The backend includes an automated end-to-end test suite verifying authentication, room creation with image upload, server pricing computation, and date collision rejection:
```bash
cd backend
npm test
```

### B. Start Backend Server
```bash
cd backend
npm start
# or npm run dev
```
The server will run on `http://localhost:5001`. (If `MONGODB_URI` is not provided in `.env`, it automatically spins up an in-memory database and auto-seeds the villas and demo accounts).

### C. Start Frontend Application
```bash
cd frontend
npm start
```
From the Expo menu:
- Press `i` to open in iOS Simulator.
- Press `a` to open in Android Emulator.
- Press `w` to open in Web Browser.

---

## 5. Demo Accounts

| Role | Email | Password | Privileges |
|---|---|---|---|
| **Admin Concierge** | `admin@thevilla.com` | `password123` | Create & delete rooms, edit pricing, approve/confirm/cancel all guest bookings |
| **VIP Guest** | `guest@thevilla.com` | `password123` | Search & browse villas, book stays, preview authoritative pricing, cancel own bookings |

*(Both accounts are accessible via the 1-Tap Demo Credentials buttons on the Login Screen).*

---

## 6. Deploying Backend to Vercel

The backend is fully configured for deployment on Vercel Serverless Functions:

### Step 1: Import Project in Vercel
1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New Project** and select your repository.
3. In **Project Settings**:
   - **Framework Preset**: `Other`
   - **Root Directory**: `backend` (or leave as `./` — configurations are provided for both).

### Step 2: Configure Environment Variables
Under **Environment Variables**, add:
- `MONGODB_URI`: Your MongoDB Atlas connection string (e.g. `mongodb+srv://...`)
- `JWT_SECRET`: A secure secret string for signing JWT tokens
- `NODE_ENV`: `production`

### Step 3: Deploy & Auto-Seed Database
1. Click **Deploy**.
2. Once deployed, if your MongoDB database is empty, visit:
   ```
   https://your-vercel-deployment.vercel.app/api/seed
   ```
   This will auto-populate the initial luxury villas and demo accounts.
3. In your mobile app (on the Login screen), tap **⚙️ Configure Server URL** and enter your Vercel deployment URL (e.g. `https://your-vercel-deployment.vercel.app`).

