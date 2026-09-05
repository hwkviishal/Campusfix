# CampusFix - Campus Maintenance & Issue-Tracking Platform

CampusFix is an enterprise-grade campus maintenance and issue-tracking platform connecting students, technicians, and administrators into an intelligent, transparent workflow.

---

## Tech Stack (MERN Full-Stack)

### Frontend
- **React.js 19** with TypeScript
- **Vite 6** (Development middleware & production bundler)
- **Tailwind CSS v4** for clean, modern SaaS styling
- **Axios** with centralized interceptors & error handlers
- **Lucide React** for icons
- **Recharts** for analytics (Admin dashboard)
- **Socket.IO Client** for real-time notifications

### Backend
- **Node.js 22** & **Express.js 4.21**
- **MongoDB** & **Mongoose 8** (with embedded MongoMemoryServer fallback for zero-friction local/sandbox execution)
- **JWT Authentication** & **bcrypt** password hashing
- **Cookie-Parser** & **CORS** middleware
- **Socket.IO** for live real-time event broadcasting
- **Cloudinary** integration for complaint & resolution photo uploads
- **Google Gemini API** for intelligent category & priority auto-classification

---

## Project Structure (Phase 1)

```
campusfix/
├── server/                    # Backend MVC Architecture
│   ├── config/
│   │   ├── db.ts              # Mongoose connection & MongoMemoryServer fallback
│   │   └── env.ts             # Typed environment variable loader & validator
│   ├── middleware/
│   │   └── errorHandler.ts    # Centralized Express error handler
│   ├── routes/
│   │   └── health.ts          # /api/health and /api/system/status routes
│   ├── models/                # (Scheduled for Phase 2)
│   └── controllers/           # (Scheduled for Phase 2)
│
├── src/                       # Frontend SPA (React + Vite)
│   ├── services/
│   │   └── api.ts             # Axios client with credentials & endpoints
│   ├── types.ts               # Shared TypeScript models & enums
│   ├── App.tsx                # Phase 1 System Monitor & Verification UI
│   ├── main.tsx               # Client entry point
│   └── index.css              # Tailwind CSS styles
│
├── server.ts                  # Server entry point (Express + Vite middleware)
├── package.json               # Dependencies and scripts
├── .env.example               # Secrets & environment declarations
└── metadata.json              # Platform configuration
```

---

## How to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Review `.env.example` and copy to `.env`:
```bash
cp .env.example .env
```
*(Note: If `MONGODB_URI` is omitted, the application automatically launches an embedded in-memory MongoDB instance for instant execution).*

### 3. Start the Development Server
```bash
npm run dev
```
The server will start on port `3000` (`http://localhost:3000`), serving both the Express REST APIs (`/api/*`) and the React client via Vite middleware.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## Phase 1 Deliverables & Testing Checklist

- [x] Full-stack architecture initialized with Express and Vite.
- [x] MongoDB connection via Mongoose configured with automatic fallback.
- [x] Centralized error handling and typed environment configuration.
- [x] REST API endpoints:
  - `GET /api/health` - Server uptime, timestamp, and database status.
  - `GET /api/system/status` - Diagnostic overview and service statuses.
- [x] Interactive client monitoring UI showing live backend telemetry and database status.
- [x] Production build validation verified.

---

## Next Milestone: Phase 2
- User, Complaint, Department, Notification, Comment, and Rating Mongoose models.
- JWT authentication with secure HTTP-only cookies.
- Password hashing with bcrypt.
- Role-based authorization middleware (`requireAuth`, `requireRole('STUDENT')`, `requireRole('TECHNICIAN')`, `requireRole('ADMIN')`).
