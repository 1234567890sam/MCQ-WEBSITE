# SmartMCQ Pro 🧠

A **production-ready SaaS-level MCQ Practice Web Application** built with the MERN stack (MongoDB, Express, React, Node.js).

---

## 🚀 Features

| Feature | Description |
|---|---|
| **Practice Mode** | Filter by subject, count. Instant answer reveal & bookmark |
| **Exam Mode** | Countdown timer, auto-submit, negative marking, question navigator |
| **Analytics Dashboard** | Chart.js charts for accuracy trend, subject performance |
| **Admin Panel** | Upload via Excel, CRUD questions, manage users, analytics |
| **Leaderboard** | Weekly / Monthly / All-time rankings |
| **PDF Results** | Download exam result as styled PDF |
| **Dark Mode** | Full dark/light theme toggle with localStorage persistence |
| **JWT Auth** | Access + Refresh tokens, HTTP-only cookies |
| **Security** | Helmet, CORS, rate limiting, bcrypt, file validation |

---

## 📁 Project Structure

```
MCQ WEBSITE/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── adminController.js
│   │   └── studentController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rateLimiter.js
│   │   └── upload.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Question.js
│   │   └── Attempt.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   └── student.js
│   ├── utils/
│   │   ├── excelParser.js
│   │   └── pdfGenerator.js
│   ├── .env
│   └── server.js
└── frontend/
    └── src/
        ├── api/axios.js
        ├── context/
        │   ├── AuthContext.jsx
        │   └── ThemeContext.jsx
        ├── components/layouts/
        │   ├── PublicLayout.jsx
        │   ├── StudentLayout.jsx
        │   └── AdminLayout.jsx
        ├── pages/
        │   ├── public/   Home, Login, Signup
        │   ├── student/  Dashboard, Practice, Exam, Result, Leaderboard, Profile
        │   └── admin/    Dashboard, Upload, ManageQuestions, ManageUsers, Analytics
        ├── App.jsx
        └── main.jsx
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)

### 1. Backend Setup

```bash
cd backend
npm install
# Edit .env with your values (see below)
npm run dev
```

**`backend/.env`:**
```
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/smartmcq
JWT_ACCESS_SECRET=your_long_random_secret_here
JWT_REFRESH_SECRET=another_long_random_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 📋 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | — | Register new user |
| POST | `/api/auth/login` | — | Login (rate limited) |
| POST | `/api/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/auth/logout` | — | Clear refresh token |
| GET | `/api/auth/me` | Token | Get current user |

### Admin (JWT + Admin role required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/upload-questions` | Upload .xlsx file |
| GET | `/api/admin/questions` | List questions (search, filter, paginate) |
| PUT | `/api/admin/questions/:id` | Update question |
| DELETE | `/api/admin/questions/:id` | Delete question |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id/role` | Change user role |
| PATCH | `/api/admin/users/:id/toggle` | Toggle user active |
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/subjects` | Get distinct subjects |

### Student (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/practice` | Get random questions |
| POST | `/api/student/submit-exam` | Submit exam/practice |
| GET | `/api/student/attempts` | Attempt history |
| GET | `/api/student/attempts/:id` | Single attempt detail |
| GET | `/api/student/dashboard` | Student stats |
| GET | `/api/student/bookmarks` | Get bookmarks |
| POST | `/api/student/bookmarks/:id` | Add bookmark |
| DELETE | `/api/student/bookmarks/:id` | Remove bookmark |
| GET | `/api/student/leaderboard` | Leaderboard |
| GET | `/api/student/result-pdf/:id` | Download PDF |
| GET | `/api/student/retry-wrong/:id` | Get wrong questions |
| PATCH | `/api/student/profile` | Update name |

---

## 📊 Excel Upload Format

Your `.xlsx` file must have these exact column headers in row 1:

| NO. | QUESTION | OPTION A | OPTION B | OPTION C | OPTION D | ANSWER | SUBJECT | MARKS |
|-----|----------|----------|----------|----------|----------|--------|---------|-------|
| 1 | What is 2+2? | 1 | 2 | 3 | 4 | D | Math | 1 |

- **ANSWER** must be `A`, `B`, `C`, or `D`
- The `NO.` column is parsed but NOT stored
- Invalid/duplicate rows are reported but not halted

---

## 🚀 Deployment

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo, set root to `backend/`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Set all environment variables from `.env`
6. Set `NODE_ENV=production` and `CLIENT_URL=https://your-vercel-url.vercel.app`

### Frontend → Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. From `frontend/`: `vercel --prod`
3. Set `VITE_API_URL=https://your-render-url.onrender.com/api`

### MongoDB → Atlas

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Get your connection string and set `MONGO_URI` in Render environment
3. Whitelist `0.0.0.0/0` in Network Access for Render's IPs

---

## 🔐 Security

- Passwords hashed with **bcrypt** (12 salt rounds)
- JWT stored in **HTTP-only cookies** (refresh) and memory (access)
- Login **rate-limited** (5 req / 15 min)
- File uploads validated by **type + size**
- **Helmet** sets security headers
- **CORS** restricted to frontend origin

---

## 📝 License

MIT — Free to use, modify, and distribute.

---

Built with ❤️ using the MERN Stack
