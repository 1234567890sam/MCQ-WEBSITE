const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/saasAdminController');

const isSaas = [verifyToken, requireRole('saas-admin')];

// Colleges
router.get('/colleges', ...isSaas, ctrl.getColleges);
router.post('/colleges', ...isSaas, ctrl.createCollege);
router.put('/colleges/:id', ...isSaas, ctrl.updateCollege);
router.put('/colleges/:id/features', ...isSaas, ctrl.updateCollegeFeatures);
router.delete('/colleges/:id', ...isSaas, ctrl.deleteCollege);
router.get('/colleges/:id/stats', ...isSaas, ctrl.getCollegeDetailedStats);
router.get('/colleges/:id/questions', ...isSaas, ctrl.getCollegeQuestions);
router.get('/colleges/:id/exams', ...isSaas, ctrl.getCollegeExams);
router.get('/colleges/:id/results', ...isSaas, ctrl.getCollegeResults);
router.get('/colleges/:id/export/students', ...isSaas, ctrl.exportCollegeStudents);
router.get('/colleges/:id/export/questions', ...isSaas, ctrl.exportCollegeQuestions);
router.post('/colleges/:id/create-admin', ...isSaas, ctrl.createCollegeAdmin);

// Global users
router.get('/users', ...isSaas, ctrl.getUsers);
router.patch('/users/:id/toggle-active', ...isSaas, ctrl.toggleUserActive);
router.patch('/users/:id', ...isSaas, ctrl.updateUser);
router.post('/users/:id/reset-password', ...isSaas, ctrl.resetUserPassword);
router.delete('/users/:id', ...isSaas, ctrl.deleteUser);

// Platform analytics
router.get('/analytics', ...isSaas, ctrl.getPlatformAnalytics);
router.get('/audit-logs', ...isSaas, ctrl.getAuditLogs);

// Exam operations
router.get('/exams/:id/export/questions', ...isSaas, ctrl.exportExamQuestions);
router.get('/exams/:id/export/results', ...isSaas, ctrl.exportExamResults);
router.patch('/exams/:id/toggle-active', ...isSaas, ctrl.toggleExamActive);
router.patch('/exams/:id/toggle-results', ...isSaas, ctrl.toggleExamResults);
router.delete('/exams/:id', ...isSaas, ctrl.deleteExam);

// Question operations
router.delete('/questions/bulk', ...isSaas, ctrl.bulkDeleteQuestions);
router.delete('/questions/:id', ...isSaas, ctrl.deleteQuestion);

// Global Trash / Recovery
router.get('/trash/colleges', ...isSaas, ctrl.getTrashedColleges);
router.get('/trash/users', ...isSaas, ctrl.getTrashedUsers);
router.get('/trash/exams', ...isSaas, ctrl.getTrashedExams);
router.get('/trash/questions', ...isSaas, ctrl.getTrashedQuestions);
router.get('/trash/results', ...isSaas, ctrl.getTrashedResults);

router.post('/recover/college/:id', ...isSaas, ctrl.recoverCollege);
router.post('/recover/user/:id', ...isSaas, ctrl.recoverUser);
router.post('/recover/exam/:id', ...isSaas, ctrl.recoverExam);
router.post('/recover/question/:id', ...isSaas, ctrl.recoverQuestion);
router.post('/recover/questions/bulk', ...isSaas, ctrl.bulkRecoverQuestions);
router.post('/recover/users/bulk', ...isSaas, ctrl.bulkRecoverUsers);
router.post('/recover/exams/bulk', ...isSaas, ctrl.bulkRecoverExams);
router.post('/recover/results/bulk', ...isSaas, ctrl.bulkRecoverResults);
router.post('/recover/result/:id', ...isSaas, ctrl.recoverResult);

// Permanent Deletion
router.delete('/trash/college/:id', ...isSaas, ctrl.deleteCollegePermanently);
router.delete('/trash/user/:id', ...isSaas, ctrl.deleteUserPermanently);
router.delete('/trash/exam/:id', ...isSaas, ctrl.deleteExamPermanently);
router.delete('/trash/question/:id', ...isSaas, ctrl.deleteQuestionPermanently);
router.delete('/trash/result/:id', ...isSaas, ctrl.deleteResultPermanently);
router.delete('/trash/questions/bulk', ...isSaas, ctrl.bulkDeleteQuestionsPermanently);
router.delete('/trash/results/bulk', ...isSaas, ctrl.bulkDeleteResultsPermanently);
router.delete('/trash/exams/bulk', ...isSaas, ctrl.bulkDeleteExamsPermanently);
router.delete('/trash/users/bulk', ...isSaas, ctrl.bulkDeleteUsersPermanently);

module.exports = router;
