const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware: Verify JWT — attaches req.user = { _id, role, collegeId, ... }
 */
const verifyToken = async (req, res, next) => {
    try {
        let token = null;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.isActive || user.isDeleted) {
            return res.status(401).json({ success: false, message: 'User not found or deactivated' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

/**
 * Middleware factory: requireRole('teacher', 'college-admin')
 * Passes if user has ANY of the listed roles.
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Required roles: ${roles.join(', ')}`,
        });
    }
    next();
};

/**
 * Backward-compat helpers (used in original routes)
 */
const requireAdmin = requireRole('college-admin', 'saas-admin');
const requireStudent = (req, res, next) => next(); // All verified users can use student routes

/**
 * Returns a MongoDB filter object that scopes all DB queries to the user's college.
 * SaaS Admin can optionally scope to a specific college by passing ?collegeId=...
 */
const tenantFilter = (req) => {
    if (req.user.role === 'saas-admin') {
        // SaaS admin can optionally filter by a specific college via query param
        if (req.query.collegeId) return { collegeId: req.query.collegeId };
        return {}; // sees all data
    }
    return { collegeId: req.user.collegeId };
};

/**
 * Middleware: inject tenantFilter into req for convenience
 */
const injectTenantFilter = (req, res, next) => {
    req.tenantFilter = tenantFilter(req);
    next();
};

module.exports = {
    verifyToken,
    requireRole,
    requireAdmin,
    requireStudent,
    tenantFilter,
    injectTenantFilter,
};
