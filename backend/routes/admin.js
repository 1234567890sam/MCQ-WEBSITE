const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
    uploadQuestions, getQuestions, updateQuestion, deleteQuestion,
    getUsers, updateUserRole, toggleUserActive, getDashboardStats, getSubjects,
} = require('../controllers/adminController');

// All admin routes require auth + admin role
router.use(verifyToken, requireAdmin);

// Questions
router.post('/upload-questions', upload.single('file'), uploadQuestions);
router.get('/questions', getQuestions);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.get('/subjects', getSubjects);

// Users
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/toggle', toggleUserActive);

// Dashboard
router.get('/dashboard', getDashboardStats);

module.exports = router;
