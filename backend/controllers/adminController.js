const Question = require('../models/Question');
const User = require('../models/User');
const Attempt = require('../models/Attempt');
const { parseExcel } = require('../utils/excelParser');

/** POST /api/admin/upload-questions */
const uploadQuestions = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { valid, errors } = parseExcel(req.file.buffer);

        if (valid.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid questions found in the file',
                errors,
            });
        }

        // Add createdBy to each question
        const questionsToInsert = valid.map((q) => ({ ...q, createdBy: req.user._id }));

        // Insert, ignoring duplicates at DB level too
        const inserted = await Question.insertMany(questionsToInsert, { ordered: false }).catch((err) => {
            // Handle duplicate key errors gracefully
            if (err.code === 11000) return err.insertedDocs || [];
            throw err;
        });

        res.status(201).json({
            success: true,
            message: `${Array.isArray(inserted) ? inserted.length : valid.length} questions uploaded successfully`,
            totalValid: valid.length,
            totalErrors: errors.length,
            errors,
        });
    } catch (error) {
        console.error('Upload Questions Error:', error);
        res.status(500).json({ success: false, message: 'Server error during upload' });
    }
};

/** GET /api/admin/questions */
const getQuestions = async (req, res) => {
    try {
        const { subject, difficulty, search, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (subject) filter.subject = subject;
        if (difficulty) filter.difficulty = difficulty;
        if (search) filter.$text = { $search: search };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [questions, total] = await Promise.all([
            Question.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).populate('createdBy', 'name'),
            Question.countDocuments(filter),
        ]);

        res.json({
            success: true,
            questions,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PUT /api/admin/questions/:id */
const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
        res.json({ success: true, question });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** DELETE /api/admin/questions/:id */
const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
        res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/users */
const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const filter = search ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            User.find(filter).select('-password').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
            User.countDocuments(filter),
        ]);

        res.json({ success: true, users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/admin/users/:id/role */
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['admin', 'student'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/admin/users/:id/toggle */
const toggleUserActive = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.isActive = !user.isActive;
        await user.save();
        res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/dashboard */
const getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, totalQuestions, totalAttempts, subjectStats, hardestQuestions, avgScore] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            Question.countDocuments(),
            Attempt.countDocuments(),
            // Most attempted subject
            Question.aggregate([
                { $group: { _id: '$subject', count: { $sum: '$timesAttempted' } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
            // Hardest questions (most wrong)
            Question.find().sort({ timesAttempted: -1 }).limit(5).select('question subject timesAttempted timesCorrect'),
            // Average score
            Attempt.aggregate([{ $group: { _id: null, avg: { $avg: '$accuracy' } } }]),
        ]);

        const hardestWithStats = hardestQuestions.map((q) => ({
            ...q.toObject(),
            wrongRate: q.timesAttempted > 0 ? (((q.timesAttempted - q.timesCorrect) / q.timesAttempted) * 100).toFixed(1) : 0,
        }));

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalQuestions,
                totalAttempts,
                avgAccuracy: avgScore[0]?.avg?.toFixed(1) || 0,
                subjectStats,
                hardestQuestions: hardestWithStats,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/subjects */
const getSubjects = async (req, res) => {
    try {
        const subjects = await Question.distinct('subject');
        res.json({ success: true, subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    uploadQuestions, getQuestions, updateQuestion, deleteQuestion,
    getUsers, updateUserRole, toggleUserActive, getDashboardStats, getSubjects,
};
