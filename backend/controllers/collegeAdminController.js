const User = require('../models/User');
const ExamSession = require('../models/ExamSession');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const { parseStudentExcel, parseExcel, parseSessionQuestionsExcel } = require('../utils/excelParser');
const XLSX = require('xlsx');
const { getStudentTestCode } = require('../utils/testCodeHelper');
const { logAction } = require('../utils/auditLogger');

// ── User Management ──────────────────────────────────────────────────────────

/** GET /api/college/teachers */
const getTeachers = async (req, res) => {
    try {
        const teachers = await User.find({ collegeId: req.user.collegeId, role: 'teacher', isDeleted: false }).select('-password').lean();
        res.json({ success: true, teachers });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** POST /api/college/teachers */
const createTeacher = async (req, res) => {
    try {
        const { name, email, password, department } = req.body;
        if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password required' });
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
        const teacher = await User.create({ name, email, password, role: 'teacher', collegeId: req.user.collegeId, department });
        
        await logAction({
            userId: req.user._id,
            action: 'CREATE',
            targetModel: 'User',
            targetId: teacher._id,
            details: `Created teacher: ${teacher.email}`
        });

        res.status(201).json({ success: true, message: 'Teacher created', teacher: { id: teacher._id, name: teacher.name, email: teacher.email } });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** PATCH /api/college/teachers/:id/toggle-active */
const toggleTeacherActive = async (req, res) => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, collegeId: req.user.collegeId, role: 'teacher' });
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
        teacher.isActive = !teacher.isActive;
        await teacher.save();
        res.json({ success: true, message: `Teacher ${teacher.isActive ? 'activated' : 'deactivated'}` });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** DELETE /api/college/teachers/:id (soft delete) */
const deleteTeacher = async (req, res) => {
    try {
        await User.findOneAndUpdate({ _id: req.params.id, collegeId: req.user.collegeId, role: 'teacher' }, { isDeleted: true, deletedAt: new Date() });
        res.json({ success: true, message: 'Teacher removed' });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** GET /api/college/students */
const getStudents = async (req, res) => {
    try {
        const { search } = req.query;
        const filter = { collegeId: req.user.collegeId, role: 'student', isDeleted: false };
        if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { studentId: new RegExp(search, 'i') }];
        const students = await User.find(filter).select('-password').lean();
        res.json({ success: true, students });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** POST /api/college/students */
const createStudent = async (req, res) => {
    try {
        const { name, email, password, studentId, semester, department } = req.body;
        if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Required fields missing' });
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
        const student = await User.create({ name, email, password, role: 'student', collegeId: req.user.collegeId, studentId, semester, department });
        
        await logAction({
            userId: req.user._id,
            action: 'CREATE',
            targetModel: 'User',
            targetId: student._id,
            details: `Created student: ${student.email}`
        });

        res.status(201).json({ success: true, message: 'Student created', student: { id: student._id, name: student.name } });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** PATCH /api/college/students/:id/toggle-active */
const toggleStudentActive = async (req, res) => {
    try {
        const student = await User.findOne({ _id: req.params.id, collegeId: req.user.collegeId, role: 'student' });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        student.isActive = !student.isActive;
        await student.save();
        res.json({ success: true, message: `Student ${student.isActive ? 'activated' : 'deactivated'}` });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** DELETE /api/college/students/:id */
const deleteStudent = async (req, res) => {
    try {
        await User.findOneAndUpdate({ _id: req.params.id, collegeId: req.user.collegeId, role: 'student' }, { isDeleted: true, deletedAt: new Date() });
        res.json({ success: true, message: 'Student removed' });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── Exams ────────────────────────────────────────────────────────────────────

/** GET /api/college/exams */
const getCollegeExams = async (req, res) => {
    try {
        const { search } = req.query;
        const filter = { collegeId: req.user.collegeId, isDeleted: false };
        if (search) {
            filter.$or = [
                { title: new RegExp(search, 'i') },
                { subject: new RegExp(search, 'i') },
                { department: new RegExp(search, 'i') }
            ];
        }
        const exams = await ExamSession.find(filter)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, exams });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** DELETE /api/college/exams/:id */
const deleteCollegeExam = async (req, res) => {
    try {
        const exam = await ExamSession.findOneAndUpdate(
            { _id: req.params.id, collegeId: req.user.collegeId },
            { isDeleted: true, deletedAt: new Date() }
        );
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
        res.json({ success: true, message: 'Exam deleted' });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── Questions ────────────────────────────────────────────────────────────────

/** POST /api/college/upload-questions */
const uploadQuestions = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const { valid, errors } = parseExcel(req.file.buffer);
        if (valid.length === 0) return res.status(400).json({ success: false, message: 'No valid questions found', errors });

        const questionsToInsert = valid.map(q => ({ 
            ...q, 
            collegeId: req.user.collegeId, 
            createdBy: req.user._id 
        }));

        const inserted = await Question.insertMany(questionsToInsert, { ordered: false }).catch(err => {
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

/** GET /api/college/questions */
const getQuestions = async (req, res) => {
    try {
        const { subject, search, page = 1, limit = 20 } = req.query;
        const filter = { collegeId: req.user.collegeId, isDeleted: false };

        if (subject) filter.subject = subject;
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

/** PUT /api/college/questions/:id */
const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findOneAndUpdate(
            { _id: req.params.id, collegeId: req.user.collegeId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
        res.json({ success: true, question });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** DELETE /api/college/questions/:id */
const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findOneAndUpdate(
            { _id: req.params.id, collegeId: req.user.collegeId },
            { isDeleted: true, deletedAt: new Date() }
        );
        if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
        res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/college/subjects */
const getSubjects = async (req, res) => {
    try {
        const subjects = await Question.aggregate([
            { $match: { collegeId: req.user.collegeId, isDeleted: false } },
            { $group: { _id: '$subject', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json({ success: true, subjects: subjects.map(s => s._id), subjectCounts: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Exam Sessions ────────────────────────────────────────────────────────────

const generateSessionCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MCQ-';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
};

/** POST /api/college/exam-sessions */
const createExamSession = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Questions file is required' });
        const { title, subject, duration, negativeMarking, allowedStudentIds } = req.body;
        if (!title || !subject) return res.status(400).json({ success: false, message: 'Title and subject are required' });

        const { questions, errors } = parseSessionQuestionsExcel(req.file.buffer);
        if (questions.length === 0) return res.status(400).json({ success: false, message: 'No valid questions found', errors });

        let sessionCode;
        let attempts = 0;
        do {
            sessionCode = generateSessionCode();
            attempts++;
        } while (await ExamSession.findOne({ sessionCode }) && attempts < 20);

        let allowedStudents = [];
        if (allowedStudentIds) {
            try { allowedStudents = JSON.parse(allowedStudentIds); } catch { }
        }

        const testCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit random number

        const session = await ExamSession.create({
            sessionCode, testCode, title, subject, questions,
            duration: parseInt(duration) || 60,
            negativeMarking: negativeMarking === 'true',
            allowedStudents,
            collegeId: req.user.collegeId,
            createdBy: req.user._id,
            createdByRole: 'college-admin'
        });

        await logAction({
            userId: req.user._id,
            action: 'CREATE',
            targetModel: 'ExamSession',
            targetId: session._id,
            details: `Created exam session: ${session.title} (${session.sessionCode})`
        });

        res.status(201).json({ success: true, session, sessionCode });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/college/exam-sessions */
const getExamSessions = async (req, res) => {
    try {
        const sessions = await ExamSession.find({ collegeId: req.user.collegeId, isDeleted: false })
            .select('-questions')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        const sessionsWithCounts = await Promise.all(sessions.map(async (s) => {
            const attemptCount = await Attempt.countDocuments({ sessionCode: s.sessionCode });
            return { ...s.toObject(), attemptCount };
        }));

        res.json({ success: true, sessions: sessionsWithCounts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/college/exam-sessions/:id */
const getExamSession = async (req, res) => {
    try {
        const session = await ExamSession.findOne({ _id: req.params.id, collegeId: req.user.collegeId }).populate('allowedStudents', 'name email');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        res.json({ success: true, session });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/college/exam-sessions/:id/toggle-active */
const toggleSessionActive = async (req, res) => {
    try {
        const session = await ExamSession.findOne({ _id: req.params.id, collegeId: req.user.collegeId });
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        session.isActive = !session.isActive;
        await session.save();
        res.json({ success: true, isActive: session.isActive, message: `Exam ${session.isActive ? 'opened' : 'closed'}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/college/exam-sessions/:id/toggle-results */
const toggleSessionResults = async (req, res) => {
    try {
        const session = await ExamSession.findOne({ _id: req.params.id, collegeId: req.user.collegeId });
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        session.showResults = !session.showResults;
        await session.save();
        res.json({ success: true, showResults: session.showResults, message: `Results ${session.showResults ? 'released' : 'hidden'}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/college/exam-sessions/:id/results */
const getSessionResults = async (req, res) => {
    try {
        const session = await ExamSession.findOne({ _id: req.params.id, collegeId: req.user.collegeId });
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const attempts = await Attempt.find({ examSessionId: session._id, isDeleted: false })
            .populate('userId', 'name email studentId')
            .sort({ score: -1 })
            .lean();

        const results = attempts.map((a, i) => ({
            rank: i + 1,
            studentName: a.userId?.name || 'Unknown',
            studentId: a.userId?.studentId || 'N/A',
            email: a.userId?.email || '',
            score: a.score,
            maxScore: a.maxScore,
            accuracy: a.accuracy,
            passed: a.passed,
            timeTaken: a.timeTaken,
            submittedAt: a.createdAt,
        }));

        if (!attempts.length) {
            return res.json({ success: true, session, results: [], analytics: null });
        }

        const total = attempts.length;
        const passed = attempts.filter(a => a.passed).length;
        const failed = total - passed;
        const avgScore = attempts.reduce((sum, r) => sum + r.percentage, 0) / total;
        const avgTimeTaken = attempts.reduce((sum, r) => sum + r.timeTaken, 0) / total;

        // Enhanced Analytics
        const coStatsMap = {};
        const questionStats = session.questions.map((q, qIdx) => {
            let correctCount = 0;
            attempts.forEach(att => {
                const ans = att.answers[qIdx];
                if (ans && ans.isCorrect) correctCount++;
            });

            const successRate = total > 0 ? (correctCount / total) * 100 : 0;
            if (q.cos && typeof q.cos === 'string') {
                const coList = q.cos.split(',').map(s => s.trim()).filter(Boolean);
                coList.forEach(co => {
                    if (!coStatsMap[co]) coStatsMap[co] = { name: co, correct: 0, total: 0 };
                    coStatsMap[co].correct += correctCount;
                    coStatsMap[co].total += total;
                });
            }

            return { index: qIdx + 1, question: q.question, successRate: Math.round(successRate) };
        });

        const coStats = Object.values(coStatsMap).map(co => ({
            name: co.name,
            accuracy: co.total > 0 ? Math.round((co.correct / co.total) * 100) : 0
        }));

        const scoreDistribution = [
            { range: '0-20%', count: attempts.filter(r => r.percentage < 20).length },
            { range: '20-40%', count: attempts.filter(r => r.percentage >= 20 && r.percentage < 40).length },
            { range: '40-60%', count: attempts.filter(r => r.percentage >= 40 && r.percentage < 60).length },
            { range: '60-80%', count: attempts.filter(r => r.percentage >= 60 && r.percentage < 80).length },
            { range: '80-100%', count: attempts.filter(r => r.percentage >= 80).length },
        ];

        res.json({
            success: true,
            session: { title: session.title, subject: session.subject, code: session.sessionCode },
            results,
            analytics: {
                total, passed, failed,
                passRate: ((passed / total) * 100).toFixed(1),
                avgScore: avgScore.toFixed(1),
                avgTimeTaken: Math.round(avgTimeTaken / 60),
                scoreDistribution,
                questionStats,
                coStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/college/exam-sessions/:id/export */
const exportSessionResults = async (req, res) => {
    try {
        const session = await ExamSession.findOne({ _id: req.params.id, collegeId: req.user.collegeId }).select('sessionCode title subject');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const format = req.query.format || 'excel';
        const attempts = await Attempt.find({ sessionCode: session.sessionCode })
            .populate('userId', 'name email studentId')
            .lean();

        // Custom sorting for Marksheet format (by Student ID)
        if (format === 'marksheet') {
            attempts.sort((a, b) => {
                const idA = String(a.userId?.studentId || '').toLowerCase();
                const idB = String(b.userId?.studentId || '').toLowerCase();
                return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
            });
        } else {
            // Default sort: by score descending
            attempts.sort((a, b) => b.score - a.score);
        }

        let rows = [];
        if (format === 'marksheet') {
            rows = attempts.map(a => ({
                ID: a.userId?.studentId || 'N/A',
                NAME: a.userId?.name || 'N/A',
                MARKS: a.score,
            }));
        } else {
            rows = attempts.map((a, i) => ({
                'Rank': i + 1,
                'Student Name': a.userId?.name || 'Unknown',
                'Email': a.userId?.email || '',
                'Score': a.score,
                'Max Score': a.maxScore,
                'Accuracy (%)': a.accuracy,
                'Correct': a.correctCount,
                'Wrong': a.wrongCount,
                'Skipped': a.skippedCount,
                'Time Taken (s)': a.timeTaken,
                'Submitted At': new Date(a.createdAt).toLocaleString('en-IN'),
            }));
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Results');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="results_${session.sessionCode}${format === 'marksheet' ? '_format' : ''}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** DELETE /api/college/exam-sessions/:id */
const deleteExamSession = async (req, res) => {
    try {
        const session = await ExamSession.findOneAndUpdate(
            { _id: req.params.id, collegeId: req.user.collegeId },
            { isDeleted: true, deletedAt: new Date() }
        );
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        res.json({ success: true, message: 'Exam session deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/college/eligible-students */
const getEligibleStudents = async (req, res) => {
    try {
        const students = await User.find({ collegeId: req.user.collegeId, role: 'student', isActive: true, isDeleted: false })
            .select('name email studentId department semester')
            .sort({ department: 1, semester: 1, name: 1 });
        res.json({ success: true, students });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/college/dashboard */
const getCollegeDashboard = async (req, res) => {
    try {
        const cid = req.user.collegeId;

        const [
            totalStudents, totalTeachers, totalExams, activeStudents, 
            passingUsers, avgAccuracyData
        ] = await Promise.all([
            User.countDocuments({ collegeId: cid, role: 'student', isDeleted: false }),
            User.countDocuments({ collegeId: cid, role: 'teacher', isDeleted: false }),
            ExamSession.countDocuments({ collegeId: cid, isDeleted: false }),
            User.countDocuments({ collegeId: cid, role: 'student', isDeleted: false, isActive: true }),
            Attempt.countDocuments({ collegeId: cid, mode: 'exam', passed: true, isDeleted: false }),
            Attempt.aggregate([
                { $match: { collegeId: cid, mode: 'exam', isDeleted: false } },
                { $group: { _id: null, avg: { $avg: '$percentage' } } }
            ])
        ]);

        const popularExams = await Attempt.aggregate([
            { $match: { collegeId: cid, mode: 'exam', isDeleted: false } },
            { $group: { _id: '$examSessionId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'examsessions', localField: '_id', foreignField: '_id', as: 'exam' } },
            { $unwind: '$exam' },
            { $project: { title: '$exam.title', count: 1 } }
        ]);

        res.json({
            success: true,
            stats: {
                totalStudents, totalTeachers, totalExams, activeStudents, passingUsers,
                avgAccuracy: avgAccuracyData[0]?.avg || 0,
                popularExams
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── College Analytics ─────────────────────────────────────────────────────────

/** GET /api/college/analytics */
const getCollegeAnalytics = async (req, res) => {
    try {
        const cid = req.user.collegeId;

        const [
            totalStudents, totalTeachers, totalExams, totalAttempts,
            passCount, failCount, avgAccuracyData, uniqueParticipatedData
        ] = await Promise.all([
            User.countDocuments({ collegeId: cid, role: 'student', isDeleted: false }),
            User.countDocuments({ collegeId: cid, role: 'teacher', isDeleted: false }),
            ExamSession.countDocuments({ collegeId: cid, isDeleted: false }),
            Attempt.countDocuments({ collegeId: cid, mode: 'exam', isDeleted: false }),
            Attempt.countDocuments({ collegeId: cid, mode: 'exam', passed: true, isDeleted: false }),
            Attempt.countDocuments({ collegeId: cid, mode: 'exam', passed: false, isDeleted: false }),
            Attempt.aggregate([
                { $match: { collegeId: cid, mode: 'exam', isDeleted: false } },
                { $group: { _id: null, avg: { $avg: '$percentage' } } }
            ]),
            Attempt.aggregate([
                { $match: { collegeId: cid, mode: 'exam', isDeleted: false } },
                { $group: { _id: '$userId' } },
                { $count: 'total' }
            ])
        ]);

        const avgAccuracy = avgAccuracyData[0]?.avg || 0;
        const uniqueParticipated = uniqueParticipatedData[0]?.total || 0;
        const participationRate = totalStudents > 0 ? (uniqueParticipated / totalStudents) * 100 : 0;
        const passingRate = totalAttempts > 0 ? (passCount / totalAttempts) * 100 : 0;

        // Subject performance
        const subjectStats = await Attempt.aggregate([
            { $match: { collegeId: cid, mode: 'exam', isDeleted: false } },
            { $group: { _id: '$subject', avgScore: { $avg: '$percentage' }, count: { $sum: 1 } } },
            { $sort: { avgScore: -1 } },
        ]);

        // Monthly exam trends
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const examTrends = await ExamSession.aggregate([
            { $match: { collegeId: cid, isDeleted: false, createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Top performing exams
        const topExams = await Attempt.aggregate([
            { $match: { collegeId: cid, mode: 'exam', isDeleted: false } },
            { $group: { _id: '$examSessionId', avgScore: { $avg: '$percentage' }, count: { $sum: 1 } } },
            { $sort: { avgScore: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'examsessions', localField: '_id', foreignField: '_id', as: 'exam' } },
            { $unwind: '$exam' },
            { $project: { title: '$exam.title', subject: '$exam.subject', avgScore: 1, count: 1 } },
        ]);

        res.json({
            success: true,
            analytics: {
                totalStudents, totalTeachers, totalExams, totalAttempts,
                avgAccuracy, participationRate, passingRate,
                passCount, failCount,
                subjectStats, examTrends, topExams,
            },
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Export ────────────────────────────────────────────────────────────────────

/** GET /api/college/export/excel */
const exportCollegeReport = async (req, res) => {
    try {
        const { generateExcel } = require('../utils/exportHelpers');
        const cid = req.user.collegeId;

        const exams = await ExamSession.find({ collegeId: cid, isDeleted: false }).lean();
        const examIds = exams.map((e) => e._id);
        const results = await Attempt.find({ examSessionId: { $in: examIds }, isDeleted: false })
            .populate('userId', 'name email studentId')
            .populate('examSessionId', 'title subject')
            .lean();

        const data = results.map((r) => ({
            'Student Name': r.userId?.name || 'N/A',
            Email: r.userId?.email || '',
            'Student ID': r.userId?.studentId || '',
            Exam: r.examSessionId?.title || '',
            Subject: r.examSessionId?.subject || '',
            Score: r.score,
            'Max Score': r.maxScore,
            Percentage: `${r.percentage?.toFixed(1)}%`,
            Passed: r.passed ? 'Yes' : 'No',
            'Time Taken (min)': Math.round(r.timeTaken / 60),
            Date: new Date(r.createdAt).toLocaleDateString(),
        }));

        const buffer = generateExcel(data, 'College Report');
        res.setHeader('Content-Disposition', 'attachment; filename="college_report.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};

/** POST /api/college/bulk-students */
const bulkCreateStudents = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const { students, errors } = parseStudentExcel(req.file.buffer);
        if (students.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid students found', errors });
        }

        const created = [];
        const skipped = [];

        for (const s of students) {
            const existing = await User.findOne({ email: s.email });
            if (existing) { skipped.push(s.email); continue; }

            const user = await User.create({
                name: s.name,
                email: s.email,
                password: s.password,
                role: 'student',
                isActive: true,
                collegeId: req.user.collegeId,
                studentId: s.studentId,
                semester: s.semester,
                department: s.department
            });

            created.push({
                name: user.name,
                email: s.email,
                password: s.password,
                studentId: user.studentId,
                dept: user.department,
                sem: user.semester
            });
        }

        // Generate credentials XLSX
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(created.map((c, i) => ({
            'Sr.': i + 1,
            'Student ID': c.studentId || 'N/A',
            'Name': c.name,
            'Dept': c.dept || 'N/A',
            'Sem': c.sem || 'N/A',
            'Email / Username': c.email,
            'Password': c.password,
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Student Credentials');
        const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.json({
            success: true,
            message: `${created.length} students created, ${skipped.length} skipped`,
            created,
            skipped,
            credentialsBase64: xlsxBuffer.toString('base64'),
            errors,
        });
    } catch (error) {
        console.error('College bulk create students error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/college/download-sample/:type */
const downloadSampleExcel = async (req, res) => {
    try {
        const { type } = req.params;
        const wb = XLSX.utils.book_new();
        let data = [];
        let filename = '';

        if (type === 'students') {
            data = [
                { 
                    'STUDENT ID': '2024-CSC-001', 
                    'NAME': 'John Doe', 
                    'EMAIL': 'john@example.com',
                    'DEPARTMENT': 'Computer Science',
                    'SEMESTER': '6',
                }
            ];
            filename = 'bulk_students_sample.xlsx';
        } else if (type === 'questions') {
            data = [{
                'QUESTION': 'What is the capital of France?',
                'OPTION A': 'London', 'OPTION B': 'Paris', 'OPTION C': 'Berlin', 'OPTION D': 'Madrid',
                'ANSWER': 'B', 'SUBJECT': 'Geography', 'COs': 'CO1, CO2', 'MARKS': 1
            }, {
                'QUESTION': '2 + 2 = ?',
                'OPTION A': '3', 'OPTION B': '4', 'OPTION C': '5', 'OPTION D': '6',
                'ANSWER': 'B', 'SUBJECT': 'Math', 'COs': 'CO3', 'MARKS': 1
            }];
            filename = 'exam_questions_sample.xlsx';
        } else if (type === 'bulk-questions') {
             data = [{
                'QUESTION': 'How many continents are there?',
                'OPTION A': '5', 'OPTION B': '6', 'OPTION C': '7', 'OPTION D': '8',
                'ANSWER': 'C', 'SUBJECT': 'Geography', 'COs': 'CO1', 'MARKS': 1
            }];
            filename = 'bulk_questions_sample.xlsx';
        } else {
            return res.status(400).json({ success: false, message: 'Invalid sample type' });
        }

        const { generateExcel } = require('../utils/exportHelpers');
        const buffer = generateExcel(data, 'SampleData');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        console.log(`Sending Excel file: ${filename} (${buffer.length} bytes)`);
        return res.status(200).end(buffer);
    } catch (error) {
        console.error('Download sample excel error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/college/exam-sessions/:id/test-code-excel */
const downloadExamTestCodeExcel = async (req, res) => {
    try {
        const exam = await ExamSession.findOne({ _id: req.params.id, collegeId: req.user.collegeId })
            .populate('allowedStudents', 'name studentId email')
            .lean();
            
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
        
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Exam Attendance');

        // Exam Info Header
        worksheet.mergeCells('A1:D1');
        const topHeader = worksheet.getCell('A1');
        topHeader.value = `EXAM: ${exam.title.toUpperCase()} (${exam.subject.toUpperCase()})`;
        topHeader.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
        topHeader.alignment = { horizontal: 'center' };
        
        worksheet.mergeCells('A2:D2');
        const codeHeader = worksheet.getCell('A2');
        codeHeader.value = `NOTE: EVERY STUDENT HAS A UNIQUE 6-DIGIT TEST CODE`;
        codeHeader.font = { bold: true, size: 14, color: { argb: 'FFDC2626' } };
        codeHeader.alignment = { horizontal: 'center' };
        codeHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };

        worksheet.addRow([]); // Gap row

        // Table Header
        const headerRow = worksheet.addRow(['#', 'STUDENT NAME', 'ID / ROLL NO', 'UNIQUE TEST CODE']);
        headerRow.height = 25;
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });

        // Students Data
        let students = [];
        if (exam.allowedStudents && exam.allowedStudents.length > 0) {
            students = exam.allowedStudents;
        } else {
            // If no specific students, get all from college
            students = await User.find({ collegeId: exam.collegeId, role: 'student', isDeleted: false }, 'name studentId email').lean();
        }

        students.forEach((s, i) => {
            const studentCode = getStudentTestCode(String(s._id), String(exam._id), exam.testCode);
            const row = worksheet.addRow([i + 1, s.name, s.studentId || s.email, studentCode]);
            row.alignment = { vertical: 'middle' };
            row.eachCell(cell => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
            // Center the # and Test Code columns
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(4).alignment = { horizontal: 'center' };
            row.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' } };
        });

        // Column widths
        worksheet.getColumn(1).width = 8;
        worksheet.getColumn(2).width = 40;
        worksheet.getColumn(3).width = 25;
        worksheet.getColumn(4).width = 15;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${exam.title.replace(/\s+/g, '_')}_TestCode.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('Excel Export Error:', e);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};

module.exports = {
    getTeachers, createTeacher, toggleTeacherActive, deleteTeacher,
    getStudents, createStudent, toggleStudentActive, deleteStudent,
    getCollegeExams,
    deleteCollegeExam,
    getCollegeAnalytics,
    getCollegeDashboard,
    exportCollegeReport,
    bulkCreateStudents,
    downloadSampleExcel,
    // Migrated admin functions
    uploadQuestions, getQuestions, updateQuestion, deleteQuestion, getSubjects,
    createExamSession, getExamSessions, getExamSession, toggleSessionActive, 
    toggleSessionResults, getSessionResults, exportSessionResults, deleteExamSession,
    getEligibleStudents, downloadExamTestCodeExcel
};
