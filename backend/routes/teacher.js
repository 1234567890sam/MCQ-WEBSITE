const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/teacherController');
const upload = require('../middleware/upload');

const isTeacher = [verifyToken, requireRole('teacher', 'college-admin', 'saas-admin')];

// Dashboard
router.get('/dashboard', ...isTeacher, ctrl.getDashboard);

// Questions bank
router.get('/questions', ...isTeacher, ctrl.getQuestions);
router.post('/questions/upload', ...isTeacher, upload.single('file'), ctrl.uploadQuestions);
router.put('/questions/:id', ...isTeacher, ctrl.updateQuestion);
router.delete('/questions/by-subject', ...isTeacher, ctrl.deleteQuestionsBySubject);
router.delete('/questions/:id', ...isTeacher, ctrl.deleteQuestion);

router.post('/bulk-parse-questions', ...isTeacher, upload.single('file'), ctrl.bulkParseQuestions);
router.get('/download-sample', ...isTeacher, ctrl.downloadSampleQuestions);

// Students in college (for assignment)
router.get('/students', ...isTeacher, ctrl.getCollegeStudents);

// Exams CRUD
router.get('/exams', ...isTeacher, ctrl.getMyExams);
router.get('/exams/:id/test-code-excel', ...isTeacher, ctrl.downloadExamTestCodeExcel);
router.post('/exams', ...isTeacher, ctrl.createExam);
router.get('/exams/:id', ...isTeacher, ctrl.getExamById);
router.put('/exams/:id', ...isTeacher, ctrl.updateExam);
router.delete('/exams/:id', ...isTeacher, ctrl.deleteExam);

// Student management on exam
router.put('/exams/:id/students', ...isTeacher, ctrl.updateExamStudents);
router.patch('/exams/:id/students/:studentId/allow-rejoin', ...isTeacher, ctrl.allowStudentRejoin);
router.patch('/exams/:id/students/:studentId/reset', ...isTeacher, ctrl.resetStudentExam);

// Results & Analytics
router.get('/analytics', ...isTeacher, ctrl.getGeneralAnalytics);
router.get('/export-results', ...isTeacher, ctrl.exportAllResults);
router.get('/subjects', ...isTeacher, ctrl.getTeacherSubjects);
router.get('/exams/:id/results', ...isTeacher, ctrl.getExamResults);
router.get('/exams/:id/analytics', ...isTeacher, ctrl.getExamAnalytics);
router.get('/exams/:id/export', ...isTeacher, ctrl.exportExamResults);

// Specific Attempt Management
router.get('/attempts/:id', ...isTeacher, ctrl.getAttemptDetails);
router.patch('/attempts/:id/answers/:index', ...isTeacher, ctrl.updateAttemptAnswer);

module.exports = router;
