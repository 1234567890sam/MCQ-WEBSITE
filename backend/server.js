require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const { initCleanupTask } = require('./utils/cleanupTask');

// Route imports
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const saasAdminRoutes = require('./routes/saasAdmin');
const collegeAdminRoutes = require('./routes/collegeAdmin');
const teacherRoutes = require('./routes/teacher');
const studentExamRoutes = require('./routes/studentExam');

const app = express();

// ── Connect Database ─────────────────────────────────────────────────────────
connectDB();

// ── Init Cleanup Tasks ───────────────────────────────────────────────────────
initCleanupTask();

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── General Middleware ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// ── Trust Proxy (so rate-limit uses real client IP, not proxy IP) ─────────────
app.set('trust proxy', 1);

// ── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Legacy routes (kept for backward compatibility)
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);

// New SaaS routes
app.use('/api/saas', saasAdminRoutes);
app.use('/api/college', collegeAdminRoutes);
app.use('/api/college-admin', collegeAdminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student-exam', studentExamRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'SmartMCQ SaaS API running', timestamp: new Date().toISOString() });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);

    if (err.message === 'Only .xlsx files are allowed') {
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size cannot exceed 5MB' });
    }

    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 SmartMCQ SaaS API running on port ${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});
