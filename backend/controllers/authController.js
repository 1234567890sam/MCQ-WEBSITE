const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const College = require('../models/College');

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m',
    });
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    });
    return { accessToken, refreshToken };
};

const cookieOpts = (req) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
});

/** POST /api/auth/signup — student self-registration with collegeId */
const signup = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { name, email, password, collegeId, studentId, semester, department } = req.body;

        if (!collegeId) return res.status(400).json({ success: false, message: 'College is required for registration' });

        const college = await College.findOne({ _id: collegeId, isActive: true, isDeleted: false });
        if (!college) return res.status(404).json({ success: false, message: 'College not found or inactive' });

        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

        const user = await User.create({
            name, email, password,
            role: 'student',
            collegeId: college._id,
            studentId, semester, department,
        });

        const { accessToken, refreshToken } = generateTokens(user._id);
        res.cookie('refreshToken', refreshToken, cookieOpts(req));

        const populatedUser = await User.findById(user._id).populate('collegeId', 'name code');

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            accessToken,
            user: { 
                id: populatedUser._id, 
                name: populatedUser.name, 
                email: populatedUser.email, 
                role: populatedUser.role, 
                collegeId: populatedUser.collegeId 
            },
        });
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
};

/** POST /api/auth/login */
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { email, password } = req.body;
        const user = await User.findOne({ email, isDeleted: false }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account has been deactivated' });
        }

        const { accessToken, refreshToken } = generateTokens(user._id);
        res.cookie('refreshToken', refreshToken, cookieOpts(req));

        const populatedUser = await User.findById(user._id).populate('collegeId', 'name code');

        res.json({
            success: true,
            message: 'Login successful',
            accessToken,
            user: {
                id: populatedUser._id,
                name: populatedUser.name,
                email: populatedUser.email,
                role: populatedUser.role,
                collegeId: populatedUser.collegeId,
                avatar: populatedUser.avatar,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

/** POST /api/auth/refresh */
const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive || user.isDeleted) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }

        const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);
        res.cookie('refreshToken', newRefresh, cookieOpts(req));
        res.json({ success: true, accessToken });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
};

/** POST /api/auth/logout */
const logout = (req, res) => {
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
    res.json({ success: true, message: 'Logged out successfully' });
};

/** GET /api/auth/me */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('bookmarks', 'question subject')
            .populate('collegeId', 'name code features');
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/auth/colleges — public: list active colleges for signup dropdown */
const getColleges = async (req, res) => {
    try {
        const colleges = await College.find({ isActive: true, isDeleted: false }, 'name code');
        res.json({ success: true, colleges });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { signup, login, refreshToken, logout, getMe, getColleges };
