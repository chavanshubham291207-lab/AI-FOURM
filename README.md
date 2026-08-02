# 🗳️ AI Forum Logo Competition Platform

A production-ready, full-stack **MERN** web application built for college logo design competitions featuring **Public QR Voting**, **Strict One Vote Per User Validation**, **Google Drive Document Previews**, **Data Import System**, **Admin Management**, and **Chart.js Analytics**.

---

## 📸 Screenshots

*(Add UI screenshots here)*

---

## ✨ Features Overview

### 1️⃣ Public QR Voting Portal
- **One Vote Per User**: Multi-layered validation combining Browser Fingerprinting + IP Address + LocalStorage Device ID.
- **HTTP 409 Conflict Protection**: Returns HTTP 409 Conflict if a duplicate vote attempt is detected.
- **PDF Document Previews**: Renders direct high-res Google CDN images and provides PDF preview cards with direct Google Drive links.
- **Star Rating System**: 1-to-5 star evaluation for candidate logo entries.
- **Anonymous Voting**: Voter identities are kept strictly confidential.

### 2️⃣ Executive Admin Control Panel
- **Fixed Credentials Login**: Secured via environment configuration (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- **Dashboard Metrics**: Real-time stats for Total Unique Voters, Total Votes, Duplicate Vote Attempts, Average Rating, and Remaining Quota.
- **Data Import Utility**: Parses `data/logos.json` spreadsheet entries directly into MongoDB Atlas.
- **Chart.js Analytics**: Rating Frequency Bar chart and Department Breakdown metrics.
- **Phase Management**: Switch between `REGISTRATION`, `VOTING`, `CLOSED`, and `WINNER_ANNOUNCED` phases.
- **CSV Export**: 1-click results download for competition audits.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Chart.js, Lucide Icons
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT, Helmet, Express-Validator
- **Database**: MongoDB Atlas

---

## 📁 Folder Structure

```text
AI FOURM/
├── client/                 # React Frontend (Vite)
│   ├── public/             # Static Assets
│   ├── src/
│   │   ├── components/     # Reusable UI Components
│   │   ├── context/        # Auth & Toast Contexts
│   │   ├── pages/          # Landing, PublicVote, AdminDashboard, AdminLogin
│   │   ├── services/       # Axios API Service
│   │   ├── utils/          # Fingerprint & Helper Utilities
│   │   ├── App.jsx         # App Routing & Providers
│   │   └── main.jsx        # Entry point
│   └── package.json
├── data/
│   └── logos.json          # Parsed Google Sheet Logo Dataset (76 Entries)
├── scripts/
│   └── importJsonToMongo.js# Data Import Utility to MongoDB Atlas
├── server/                 # Express Backend API
│   ├── config/             # DB & Config
│   ├── controllers/        # Public & Admin Controllers
│   ├── middleware/         # Auth & Rate Limiting Middleware
│   ├── models/             # Mongoose Schemas (Logo, Vote, DuplicateAttempt, User, Setting)
│   ├── routes/             # API Routes
│   ├── services/           # Auto Import & Helper Services
│   ├── server.js           # Server Entrypoint
│   └── package.json
├── .gitignore
└── README.md
```

---

## 🔑 Environment Variables

Create `.env` inside the `/server` directory:

```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ai-forum?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_ai_forum_2026_secure
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@aiforum.com
ADMIN_PASSWORD=jspm@2026
CLIENT_URL=http://localhost:5000
```

---

## 🚀 Installation & Running

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd "AI FOURM"

# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Import Dataset to MongoDB Atlas (Optional)

```bash
cd scripts
node importJsonToMongo.js
```

### 3. Run Locally

```bash
cd server
npm start
```

Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## 📡 API Endpoints

### Public Endpoints (`/api/public`)
- `GET /api/public/config` - Fetch competition phase and quota limits.
- `GET /api/public/logos` - Fetch list of logo candidates.
- `GET /api/public/logo-image/:id` - High-performance image/document preview proxy.
- `GET /api/public/voter-status` - Check if requesting device/IP has voted.
- `POST /api/public/vote` - Submit a vote (Returns 409 Conflict on duplicate).

### Admin Endpoints (`/api/admin`)
- `POST /api/auth/login` - Admin Login.
- `GET /api/admin/stats` - Fetch Dashboard Statistics & Duplicate Metrics.
- `GET /api/admin/logos` - Detailed Candidate List.
- `GET /api/admin/analytics` - Leaderboard & Rating Analytics.
- `PUT /api/admin/phase` - Update Competition Phase.
- `POST /api/admin/import-json` - Trigger JSON Data Import.

---

## 📄 License

This project is licensed under the MIT License.
