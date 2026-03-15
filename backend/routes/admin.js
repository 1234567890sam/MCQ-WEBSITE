const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
    uploadQuestions, getQuestions, updateQuestion, deleteQuestion,
    getUsers, updateUserRole, toggleUserActive, getDashboardStats, getSubjects,
    getStudentAnalytics, deleteQuestionsBySubject,
    bulkCreateStudents, createExamSession, getExamSessions, getExamSession,
    toggleSessionActive, toggleSessionResults, getSessionResults, exportSessionResults,
    deleteExamSession, downloadSampleExcel, getEligibleStudents,
} = require('../controllers/adminController');

// All admin routes require auth + admin role
router.use(verifyToken, requireAdmin);

// Questions
router.post('/upload-questions', upload.single('file'), uploadQuestions);
router.get('/questions', getQuestions);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.delete('/questions/subject/:subject', deleteQuestionsBySubject);
router.get('/subjects', getSubjects);

// Users
router.get('/users', getUsers);
router.get('/eligible-students', getEligibleStudents);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/toggle', toggleUserActive);
router.get('/users/:id/analytics', getStudentAnalytics);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Bulk student creation
router.post('/bulk-create-students', upload.single('file'), bulkCreateStudents);

// Exam sessions
router.post('/exam-sessions', upload.single('file'), createExamSession);
router.get('/exam-sessions', getExamSessions);
router.get('/exam-sessions/:id', getExamSession);
router.patch('/exam-sessions/:id/toggle-active', toggleSessionActive);
router.patch('/exam-sessions/:id/toggle-results', toggleSessionResults);
router.get('/exam-sessions/:id/results', getSessionResults);
router.get('/exam-sessions/:id/export', exportSessionResults);
router.get('/download-sample/:type', downloadSampleExcel);
router.delete('/exam-sessions/:id', deleteExamSession);

module.exports = router;
