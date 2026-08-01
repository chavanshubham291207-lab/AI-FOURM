# 🚀 AI Forum Logo Design Competition System

A production-ready, full-stack **MERN** web application built for college logo design competitions featuring **Blind Voting**, **Role-Based Access Control**, and **Three Independent Dashboards** (Student, Voting, and Admin).

---

## ✨ Features Overview

### 1️⃣ Student Portal
- **Single Logo Submission**: Strict database & controller validation preventing students from submitting more than one logo entry.
- **Submission Editing**: Edit logo title, description, or image before the competition deadline.
- **Disposable Email Guard**: Rejects demo/fake email addresses (`demo@gmail.com`, `mailinator.com`, etc.).
- **Privacy Assurance**: Students view ONLY their own logo submission and global winner announcement.
- **Winner Reveal**: Interactive confetti celebration when the winner is declared.

### 2️⃣ Voting Portal
- **100% Blind Voting System**: Displays ONLY Logo Image, Entry ID (e.g. `AI-001`), and 1–5 Star Rating.
- **Complete Anonymity**: Student names, roll numbers, and departments are completely hidden from voters.
- **Single Vote Rule**: Voters can rate each logo only once.
- **Focus & Grid Views**: Interactive slider to evaluate entries one-by-one or browse the full gallery.

### 3️⃣ Admin Control Panel
- **Fixed Credentials Login**: Secured via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- **Dashboard Metrics**: Real-time stats for Total Students, Total Logos, Total Votes, Average Rating, and Active Phase.
- **Identity Unveiling Table**: Admin-exclusive mapping between anonymous Entry IDs (`AI-001`) and student identities.
- **Chart.js Analytics**: Rating Frequency Bar chart and Department Breakdown Doughnut chart.
- **Phase Management**: Switch between `REGISTRATION`, `VOTING`, `CLOSED`, and `WINNER_ANNOUNCED` phases.
- **Winner Announcement & CSV Export**: 1-click winner declaration and CSV results download.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Chart.js, Canvas Confetti, Lucide Icons
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT, bcryptjs, Multer, Helmet, Express-Validator
- **Database**: MongoDB Atlas (with automatic MongoMemoryServer fallback for local testing)

---

## 🚀 Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env` inside `/server`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ai-forum
JWT_SECRET=super_secret_jwt_key
ADMIN_EMAIL=admin@aiforum.com
ADMIN_PASSWORD=jspm@2026
```

### 2. Backend Server

```bash
cd server
npm install
npm start
```

### 3. Frontend Client

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Credentials

- **Admin Login**: `admin@aiforum.com` / `jspm@2026`
- **Student Login**: Register with any valid college email address.
- **Voter Login**: Register with any valid voter email address.

---

## 📜 License

MIT License. Designed for AI Forum College Competitions.
