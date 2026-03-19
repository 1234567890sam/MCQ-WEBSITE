const College = require('../models/College');
const User = require('../models/User');
const ExamSession = require('../models/ExamSession');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/auditLogger');

// ── Colleges ────────────────────────────────────────────────────────────────

/** GET /api/saas/colleges */
const getColleges = async (req, res) => {
    try {
        const colleges = await College.find({ isDeleted: false }).lean();
        // Enrich with user counts
        const enriched = await Promise.all(
            colleges.map(async (c) => {
                const studentCount = await User.countDocuments({ collegeId: c._id, role: 'student', isDeleted: false });
                const teacherCount = await User.countDocuments({ collegeId: c._id, role: 'teacher', isDeleted: false });
                const examCount = await ExamSession.countDocuments({ collegeId: c._id, isDeleted: false });
                return { ...c, studentCount, teacherCount, examCount };
            })
        );
        res.json({ success: true, colleges: enriched });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/saas/colleges */
const createCollege = async (req, res) => {
    try {
        const { name, code, email, phone, address } = req.body;
        if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code required' });
        const college = await College.create({ name, code: code.toUpperCase(), email, phone, address });
        
        await logAction({
            userId: req.user._id,
            action: 'CREATE',
            targetModel: 'College',
            targetId: college._id,
            details: `Created college: ${college.name} (${college.code})`
        });

        res.status(201).json({ success: true, message: 'College created', college });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: 'College code already exists' });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PUT /api/saas/colleges/:id */
const updateCollege = async (req, res) => {
    try {
        const college = await College.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!college) return res.status(404).json({ success: false, message: 'College not found' });
        res.json({ success: true, message: 'College updated', college });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PUT /api/saas/colleges/:id/features */
const updateCollegeFeatures = async (req, res) => {
    try {
        const { practiceMode, uploadPermission, maxStudents, isActive } = req.body;
        const update = {};
        if (practiceMode !== undefined) update['features.practiceMode'] = practiceMode;
        if (uploadPermission !== undefined) update['features.uploadPermission'] = uploadPermission;
        if (maxStudents !== undefined) update['features.maxStudents'] = maxStudents;
        if (isActive !== undefined) update.isActive = isActive;

        const college = await College.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
        if (!college) return res.status(404).json({ success: false, message: 'College not found' });
        res.json({ success: true, message: 'Features updated', college });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** DELETE /api/saas/colleges/:id (soft) */
const deleteCollege = async (req, res) => {
    try {
        await College.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
        
        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'College',
            targetId: req.params.id,
            details: `Deleted college: ${req.params.id}`
        });

        res.json({ success: true, message: 'College deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Global Users ─────────────────────────────────────────────────────────────

/** GET /api/saas/users */
const getUsers = async (req, res) => {
    try {
        const { role, collegeId, search } = req.query;
        const filter = { isDeleted: false };
        if (role) filter.role = role;
        if (collegeId) filter.collegeId = collegeId;
        if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

        const users = await User.find(filter)
            .populate('collegeId', 'name code')
            .select('-password')
            .lean();
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/saas/users/:id/toggle-active */
const toggleUserActive = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.isActive = !user.isActive;
        await user.save();
        res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/saas/users/:id */
const updateUser = async (req, res) => {
    try {
        const { name, email, role, collegeId } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        
        // collegeId can be null for saas-admin
        if (collegeId !== undefined) {
            user.collegeId = collegeId || null;
        }

        await user.save();
        res.json({ success: true, message: 'User updated successfully', user });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** DELETE /api/saas/users/:id (soft) */
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        if (user.role === 'saas-admin' && req.user._id.toString() === user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
        }

        user.isDeleted = true;
        user.deletedAt = new Date();
        await user.save();

        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'User',
            targetId: user._id,
            details: `Soft-deleted user: ${user.email} (${user.role})`
        });

        res.json({ success: true, message: 'User moved to trash' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** GET /api/saas/trash/users */
const getTrashedUsers = async (req, res) => {
    try {
        const users = await User.find({ isDeleted: true })
            .populate('collegeId', 'name')
            .select('-password')
            .sort({ deletedAt: -1 })
            .lean();
        res.json({ success: true, users });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** POST /api/saas/recover/user/:id */
const recoverUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        await logAction({
            userId: req.user._id,
            action: 'RESTORE',
            targetModel: 'User',
            targetId: user._id,
            details: `Recovered user: ${user.email}`
        });

        res.json({ success: true, message: 'User restored' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** POST /api/saas/users/:id/reset-password */
const resetUserPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.password = password;
        await user.save();

        await logAction({
            userId: req.user._id,
            action: 'UPDATE',
            targetModel: 'User',
            targetId: user._id,
            details: `Reset password for user: ${user.email}`,
            metadata: { type: 'PASSWORD_RESET' }
        });

        res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// ── Platform Analytics ────────────────────────────────────────────────────────

/** GET /api/saas/analytics */
const getPlatformAnalytics = async (req, res) => {
    try {
        const [totalColleges, totalStudents, totalTeachers, totalExams, totalResults] = await Promise.all([
            College.countDocuments({ isDeleted: false }),
            User.countDocuments({ role: 'student', isDeleted: false }),
            User.countDocuments({ role: 'teacher', isDeleted: false }),
            ExamSession.countDocuments({ isDeleted: false }),
            Attempt.countDocuments({ mode: 'exam', isDeleted: false }),
        ]);

        // Per-college breakdown
        const colleges = await College.find({ isDeleted: false }, '_id name').lean();
        const collegeStats = await Promise.all(colleges.map(async (c) => ({
            name: c.name,
            students: await User.countDocuments({ collegeId: c._id, role: 'student', isDeleted: false }),
            exams: await ExamSession.countDocuments({ collegeId: c._id, isDeleted: false }),
            results: await Attempt.countDocuments({ collegeId: c._id, mode: 'exam', isDeleted: false }),
        })));

        res.json({
            success: true,
            analytics: { totalColleges, totalStudents, totalTeachers, totalExams, totalResults, collegeStats },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Recovery Panel (Soft Delete) ──────────────────────────────────────────────

/** GET /api/saas/trash/colleges */
const getTrashedColleges = async (req, res) => {
    try {
        const colleges = await College.find({ isDeleted: true }).lean();
        res.json({ success: true, colleges });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** POST /api/saas/recover/college/:id */
const recoverCollege = async (req, res) => {
    try {
        await College.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null });
        
        await logAction({
            userId: req.user._id,
            action: 'RESTORE',
            targetModel: 'College',
            targetId: req.params.id,
            details: `Recovered college: ${req.params.id}`
        });

        res.json({ success: true, message: 'College restored' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** GET /api/saas/trash/exams */
const getTrashedExams = async (req, res) => {
    try {
        const exams = await ExamSession.find({ isDeleted: true })
            .populate('collegeId', 'name')
            .populate('createdBy', 'name')
            .lean();
        res.json({ success: true, exams });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/saas/trash/questions */
const getTrashedQuestions = async (req, res) => {
    try {
        const questions = await Question.find({ isDeleted: true })
            .populate('collegeId', 'name')
            .populate('createdBy', 'name')
            .lean();
        res.json({ success: true, questions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/saas/trash/results */
const getTrashedResults = async (req, res) => {
    try {
        const results = await Attempt.find({ isDeleted: true, mode: 'exam' })
            .populate('userId', 'name email')
            .populate('examSessionId', 'title')
            .lean();
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/saas/recover/exam/:id */
const recoverExam = async (req, res) => {
    try {
        await ExamSession.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null });
        
        await logAction({
            userId: req.user._id,
            action: 'RESTORE',
            targetModel: 'ExamSession',
            targetId: req.params.id,
            details: `Recovered exam: ${req.params.id}`
        });

        res.json({ success: true, message: 'Exam restored' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/saas/recover/question/:id */
const recoverQuestion = async (req, res) => {
    try {
        await Question.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null });
        res.json({ success: true, message: 'Question restored' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/saas/recover/result/:id */
const recoverResult = async (req, res) => {
    try {
        await Attempt.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null });
        res.json({ success: true, message: 'Result restored' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Create College Admin ──────────────────────────────────────────────────────

/** GET /api/saas/colleges/:id/stats */
const getCollegeDetailedStats = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[SAAS] Fetching stats for college: ${id}`);
        const mongoose = require('mongoose');
        
        const college = await College.findById(id).lean();
        if (!college) {
            console.log(`[SAAS] College not found: ${id}`);
            return res.status(404).json({ success: false, message: 'College not found' });
        }

        const [students, teachers, exams, results, questionStats] = await Promise.all([
            User.countDocuments({ collegeId: id, role: 'student', isDeleted: false }),
            User.countDocuments({ collegeId: id, role: 'teacher', isDeleted: false }),
            ExamSession.countDocuments({ collegeId: id, isDeleted: false }),
            Attempt.countDocuments({ collegeId: id, mode: 'exam', isDeleted: false }),
            Question.aggregate([
                { $match: { collegeId: new mongoose.Types.ObjectId(id), isDeleted: false } },
                { $group: { _id: '$subject', count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ])
        ]);

        console.log(`[SAAS] Stats fetched successfully for: ${college.name}`);
        res.json({
            success: true,
            stats: { 
                college, 
                counts: { students, teachers, exams, results }, 
                questions: questionStats 
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/saas/colleges/:id/questions */
const getCollegeQuestions = async (req, res) => {
    try {
        const { id } = req.params;
        const questions = await Question.find({ collegeId: id })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, questions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/saas/colleges/:id/exams */
const getCollegeExams = async (req, res) => {
    try {
        const { id } = req.params;
        const exams = await ExamSession.find({ collegeId: id })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, exams });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/saas/colleges/:id/results */
const getCollegeResults = async (req, res) => {
    try {
        const { id } = req.params;
        const results = await Attempt.find({ collegeId: id, mode: 'exam' })
            .populate('userId', 'name email studentId')
            .populate('examSessionId', 'title')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/saas/colleges/:id/export/students */
const exportCollegeStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const college = await College.findById(id);
        if (!college) return res.status(404).json({ success: false, message: 'College not found' });

        const students = await User.find({ collegeId: id, role: 'student', isDeleted: false })
            .select('name email studentId semester department')
            .lean();

        const data = students.map(s => ({
            'Student Name': s.name,
            'Email': s.email,
            'Student ID': s.studentId || 'N/A',
            'Semester': s.semester || 'N/A',
            'Department': s.department || 'N/A'
        }));

        const { generateExcel } = require('../utils/exportHelpers');
        const buffer = generateExcel(data, `${college.code}_Students`);

        res.setHeader('Content-Disposition', `attachment; filename="${college.code}_students.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};

/** GET /api/saas/colleges/:id/export/questions */
const exportCollegeQuestions = async (req, res) => {
    try {
        const { id } = req.params;
        const college = await College.findById(id);
        if (!college) return res.status(404).json({ success: false, message: 'College not found' });

        const questions = await Question.find({ collegeId: id, isDeleted: false }).lean();

        const data = questions.map(q => ({
            'Question': q.question,
            'Option A': q.options[0],
            'Option B': q.options[1],
            'Option C': q.options[2],
            'Option D': q.options[3],
            'Answer': q.correctAnswer,
            'Subject': q.subject,
            'COs': q.cos || '',
            'Marks': q.marks
        }));

        const { generateExcel } = require('../utils/exportHelpers');
        const buffer = generateExcel(data, `${college.code}_Questions`);

        res.setHeader('Content-Disposition', `attachment; filename="${college.code}_questions.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};

/** POST /api/saas/colleges/:id/create-admin */
const createCollegeAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const college = await College.findById(req.params.id);
        if (!college) return res.status(404).json({ success: false, message: 'College not found' });

        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

        const admin = await User.create({
            name, email, password,
            role: 'college-admin',
            collegeId: college._id,
        });
        res.status(201).json({ success: true, message: 'College admin created', user: { id: admin._id, name: admin.name, email: admin.email } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/saas/exams/:id/export/questions */
const exportExamQuestions = async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await ExamSession.findById(id).lean();
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

        const data = exam.questions.map(q => ({
            'Question': q.question,
            'Option A': q.options[0],
            'Option B': q.options[1],
            'Option C': q.options[2],
            'Option D': q.options[3],
            'Answer': q.correctAnswer,
            'Subject': q.subject,
            'COs': q.cos || '',
            'Marks': q.marks
        }));

        const { generateExcel } = require('../utils/exportHelpers');
        const buffer = generateExcel(data, `${exam.title}_Questions`);

        res.setHeader('Content-Disposition', `attachment; filename="exam_${exam.sessionCode}_questions.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};

/** GET /api/saas/exams/:id/export/results */
const exportExamResults = async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await ExamSession.findById(id).select('sessionCode title');
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

        const attempts = await Attempt.find({ examSessionId: id })
            .populate('userId', 'name email studentId')
            .lean();

        const data = attempts.map((a, i) => ({
            'Rank': i + 1,
            'Student Name': a.userId?.name || 'Unknown',
            'Student ID': a.userId?.studentId || 'N/A',
            'Email': a.userId?.email || '',
            'Score': a.score,
            'Max Score': a.maxScore,
            'Accuracy (%)': a.accuracy,
            'Submitted At': new Date(a.createdAt).toLocaleString()
        }));

        const { generateExcel } = require('../utils/exportHelpers');
        const buffer = generateExcel(data, `${exam.title}_Results`);

        res.setHeader('Content-Disposition', `attachment; filename="exam_${exam.sessionCode}_results.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};

/** PATCH /api/saas/exams/:id/toggle-active */
const toggleExamActive = async (req, res) => {
    try {
        const exam = await ExamSession.findById(req.params.id);
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
        exam.isActive = !exam.isActive;
        await exam.save();
        res.json({ success: true, message: `Exam ${exam.isActive ? 'activated' : 'deactivated'}` });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** PATCH /api/saas/exams/:id/toggle-results */
const toggleExamResults = async (req, res) => {
    try {
        const exam = await ExamSession.findById(req.params.id);
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
        exam.showResults = !exam.showResults;
        await exam.save();
        res.json({ success: true, message: `Results ${exam.showResults ? 'released' : 'hidden'}` });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** DELETE /api/saas/exams/:id */
const deleteExam = async (req, res) => {
    try {
        await ExamSession.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
        
        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'ExamSession',
            targetId: req.params.id,
            details: `Soft-deleted exam session: ${req.params.id}`
        });

        res.json({ success: true, message: 'Exam soft-deleted' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** DELETE /api/saas/questions/:id */
const deleteQuestion = async (req, res) => {
    try {
        await Question.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
        res.json({ success: true, message: 'Question soft-deleted' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** GET /api/saas/audit-logs */
const getAuditLogs = async (req, res) => {
    try {
        const { userId, action, targetModel, search, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (userId) filter.userId = userId;
        if (action) filter.action = action;
        if (targetModel) filter.targetModel = targetModel;
        
        if (search) {
            filter.$or = [
                { details: new RegExp(search, 'i') },
                { 'metadata.type': new RegExp(search, 'i') }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .populate('userId', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            AuditLog.countDocuments(filter)
        ]);

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get Audit Logs Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** Permanent Deletion Functions (ONLY for trashed items) */

const deleteCollegePermanently = async (req, res) => {
    try {
        const college = await College.findOneAndDelete({ _id: req.params.id, isDeleted: true });
        if (!college) return res.status(404).json({ success: false, message: 'College not found in trash' });
        
        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'College',
            targetId: req.params.id,
            details: `PERMANENTLY DELETED college: ${college.name}`
        });

        res.json({ success: true, message: 'College deleted permanently' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

const deleteUserPermanently = async (req, res) => {
    try {
        const user = await User.findOneAndDelete({ _id: req.params.id, isDeleted: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found in trash' });

        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'User',
            targetId: req.params.id,
            details: `PERMANENTLY DELETED user: ${user.email}`
        });

        res.json({ success: true, message: 'User deleted permanently' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

const deleteExamPermanently = async (req, res) => {
    try {
        const exam = await ExamSession.findOneAndDelete({ _id: req.params.id, isDeleted: true });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found in trash' });

        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'ExamSession',
            targetId: req.params.id,
            details: `PERMANENTLY DELETED exam: ${exam.title}`
        });

        res.json({ success: true, message: 'Exam deleted permanently' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

const deleteQuestionPermanently = async (req, res) => {
    try {
        const question = await Question.findOneAndDelete({ _id: req.params.id, isDeleted: true });
        if (!question) return res.status(404).json({ success: false, message: 'Question not found in trash' });

        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'Question',
            targetId: req.params.id,
            details: `PERMANENTLY DELETED question`
        });

        res.json({ success: true, message: 'Question deleted permanently' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

const deleteResultPermanently = async (req, res) => {
    try {
        const result = await Attempt.findOneAndDelete({ _id: req.params.id, isDeleted: true });
        if (!result) return res.status(404).json({ success: false, message: 'Result not found in trash' });

        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'Attempt',
            targetId: req.params.id,
            details: `PERMANENTLY DELETED result`
        });

        res.json({ success: true, message: 'Result deleted permanently' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = {
    getColleges, createCollege, updateCollege, updateCollegeFeatures, deleteCollege,
    getUsers, toggleUserActive,
    getPlatformAnalytics,
    getTrashedColleges, recoverCollege,
    getTrashedExams, getTrashedQuestions, getTrashedResults,
    recoverExam, recoverQuestion, recoverResult,
    createCollegeAdmin,
    getCollegeDetailedStats, exportCollegeStudents, exportCollegeQuestions,
    getCollegeQuestions, getCollegeExams, getCollegeResults,
    exportExamQuestions, exportExamResults,
    toggleExamActive, toggleExamResults, deleteExam, deleteQuestion,
    updateUser, resetUserPassword, deleteUser,
    getTrashedUsers, recoverUser,
    getAuditLogs,
    deleteCollegePermanently, deleteUserPermanently, deleteExamPermanently, 
    deleteQuestionPermanently, deleteResultPermanently
};
