const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { signup, login, refreshToken, logout, getMe, getColleges } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const signupValidation = [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('collegeId').notEmpty().withMessage('College selection is required'),
    body('studentId').trim().notEmpty().withMessage('Enrollment Number is required'),
    body('semester').notEmpty().withMessage('Semester is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
];

// Public: list colleges for signup dropdown
router.get('/colleges', getColleges);

router.post('/signup', authLimiter, signupValidation, signup);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);

module.exports = router;
