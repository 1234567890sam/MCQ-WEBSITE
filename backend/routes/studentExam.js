const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/studentExamController');

const isStudent = [verifyToken, requireRole('student', 'teacher', 'college-admin', 'saas-admin')];

// Active exams
router.get('/exams/active', ...isStudent, ctrl.getActiveExams);

// Exam lifecycle
router.post('/exams/:id/start', ...isStudent, ctrl.startExam);
router.get('/exams/:id/resume', ...isStudent, ctrl.resumeExam);
router.put('/exams/:id/save-progress', ...isStudent, ctrl.saveProgress);
router.post('/exams/:id/submit', ...isStudent, ctrl.submitExam);

// Results
router.get('/results', ...isStudent, ctrl.getMyResults);
router.get('/results/:id', ...isStudent, ctrl.getResultById);

module.exports = router;
