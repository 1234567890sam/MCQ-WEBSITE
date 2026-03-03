const express = require('express');
const router = express.Router();
const { verifyToken, requireStudent } = require('../middleware/auth');
const {
    getPracticeQuestions, submitExam, getAttemptHistory, getAttemptById,
    getDashboardStats, addBookmark, removeBookmark, getBookmarks,
    getLeaderboard, downloadResultPDF, getWrongQuestions, updateProfile,
} = require('../controllers/studentController');
const { getSubjects } = require('../controllers/adminController');

// All student routes require authentication
router.use(verifyToken, requireStudent);

// Practice & Exam
router.get('/practice', getPracticeQuestions);
router.post('/submit-exam', submitExam);
router.get('/subjects', getSubjects);

// Attempts
router.get('/attempts', getAttemptHistory);
router.get('/attempts/:id', getAttemptById);
router.get('/retry-wrong/:attemptId', getWrongQuestions);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Bookmarks
router.get('/bookmarks', getBookmarks);
router.post('/bookmarks/:questionId', addBookmark);
router.delete('/bookmarks/:questionId', removeBookmark);

// Leaderboard
router.get('/leaderboard', getLeaderboard);

// PDF
router.get('/result-pdf/:attemptId', downloadResultPDF);

// Profile
router.patch('/profile', updateProfile);

module.exports = router;
