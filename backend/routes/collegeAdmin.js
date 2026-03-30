const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/collegeAdminController');
const upload = require('../middleware/upload');

const isCollegeAdmin = [verifyToken, requireRole('college-admin', 'saas-admin')];

// Dashboard
router.get('/dashboard', ...isCollegeAdmin, ctrl.getCollegeDashboard);

// Teachers
router.get('/teachers', ...isCollegeAdmin, ctrl.getTeachers);
router.post('/teachers', ...isCollegeAdmin, ctrl.createTeacher);
router.patch('/teachers/:id/toggle-active', ...isCollegeAdmin, ctrl.toggleTeacherActive);
router.delete('/teachers/:id', ...isCollegeAdmin, ctrl.deleteTeacher);

// Students
router.get('/students', ...isCollegeAdmin, ctrl.getStudents);
router.post('/students', ...isCollegeAdmin, ctrl.createStudent);
router.get('/departments', ...isCollegeAdmin, ctrl.getDepartments);
router.patch('/students/:id/toggle-active', ...isCollegeAdmin, ctrl.toggleStudentActive);
router.delete('/students/:id', ...isCollegeAdmin, ctrl.deleteStudent);
router.post('/bulk-students', ...isCollegeAdmin, upload.single('file'), ctrl.bulkCreateStudents);
router.get('/download-sample/:type', ...isCollegeAdmin, ctrl.downloadSampleExcel);

// Exams
router.get('/exams', ...isCollegeAdmin, ctrl.getCollegeExams);
router.delete('/exams/:id', ...isCollegeAdmin, ctrl.deleteCollegeExam);

// Questions (Migrated)
router.post('/upload-questions', ...isCollegeAdmin, upload.single('file'), ctrl.uploadQuestions);
router.get('/questions', ...isCollegeAdmin, ctrl.getQuestions);
router.put('/questions/:id', ...isCollegeAdmin, ctrl.updateQuestion);
router.delete('/questions/by-subject', ...isCollegeAdmin, ctrl.deleteQuestionsBySubject);
router.delete('/questions/:id', ...isCollegeAdmin, ctrl.deleteQuestion);
router.get('/subjects', ...isCollegeAdmin, ctrl.getSubjects);

// Exam Sessions (Migrated)
router.post('/exam-sessions', ...isCollegeAdmin, upload.single('file'), ctrl.createExamSession);
router.get('/exam-sessions', ...isCollegeAdmin, ctrl.getExamSessions);
router.get('/exam-sessions/:id', ...isCollegeAdmin, ctrl.getExamSession);
router.patch('/exam-sessions/:id/toggle-active', ...isCollegeAdmin, ctrl.toggleSessionActive);
router.patch('/exam-sessions/:id/toggle-results', ...isCollegeAdmin, ctrl.toggleSessionResults);
router.get('/exam-sessions/:id/results', ...isCollegeAdmin, ctrl.getSessionResults);
router.get('/exam-sessions/:id/export', ...isCollegeAdmin, ctrl.exportSessionResults);
router.get('/exam-sessions/:id/test-code-excel', ...isCollegeAdmin, ctrl.downloadExamTestCodeExcel);
router.delete('/exam-sessions/:id', ...isCollegeAdmin, ctrl.deleteExamSession);
router.get('/eligible-students', ...isCollegeAdmin, ctrl.getEligibleStudents);

// Analytics
router.get('/analytics', ...isCollegeAdmin, ctrl.getCollegeAnalytics);

// Export
router.get('/export/excel', ...isCollegeAdmin, ctrl.exportCollegeReport);

module.exports = router;
