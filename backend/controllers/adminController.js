const Question = require('../models/Question');
const User = require('../models/User');
const Attempt = require('../models/Attempt');
const ExamSession = require('../models/ExamSession');
const { parseExcel, parseStudentExcel, parseSessionQuestionsExcel } = require('../utils/excelParser');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');

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
        const { subject, search, page = 1, limit = 20 } = req.query;
        const filter = {};

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
        const [totalUsers, totalQuestions, totalAttempts, subjectStats, hardestQuestions, avgScore, totalSubjects, subjectDistribution, attemptsTrend, subjectPerformance, attemptSubjectStats] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            Question.countDocuments(),
            Attempt.countDocuments(),
            // Most attempted subject
            Question.aggregate([
                { $group: { _id: '$subject', count: { $sum: '$timesAttempted' } } },
                { $sort: { count: -1 } },
            ]),
            // Hardest questions
            Question.find({ timesAttempted: { $gt: 0 } }).select('question subject timesAttempted timesCorrect').then(docs => {
               return docs.map(q => ({
                    ...q.toObject(),
                    wrongRate: parseFloat((((q.timesAttempted - q.timesCorrect) / q.timesAttempted) * 100).toFixed(1))
               })).sort((a,b) => b.wrongRate - a.wrongRate).slice(0, 5);
            }),
            // Average score as accuracy
            Attempt.aggregate([{ $group: { _id: null, avg: { $avg: '$accuracy' } } }]),
            // Total Subjects count
            Question.distinct('subject').then(res => res.length),
            // Subject Distribution (Total questions by subject)
            Question.aggregate([{ $group: { _id: '$subject', count: { $sum: 1 } } }]),
            // Score Trend
            Attempt.aggregate([
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, avgAccuracy: { $avg: '$accuracy' }, attempts: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            // Hardest subject (highest wrong answers)
            Question.aggregate([
                { $group: { _id: '$subject', totalAttempted: { $sum: '$timesAttempted' }, totalCorrect: { $sum: '$timesCorrect' } } },
                { $project: { _id: 1, totalAttempted: 1, totalCorrect: 1, wrongAnswers: { $subtract: ['$totalAttempted', '$totalCorrect'] }, correctRate: { $cond: [ { $gt: ['$totalAttempted', 0] }, { $multiply: [ { $divide: ['$totalCorrect', '$totalAttempted'] }, 100 ] }, 0 ] } } },
                { $sort: { wrongAnswers: -1 } }
            ]),
            // Subject-wise Attempts
            Attempt.aggregate([
                { $group: { _id: '$subject', avgScore: { $avg: '$accuracy' }, attempts: { $sum: 1 } } }
            ])
        ]);

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalQuestions,
                totalAttempts,
                totalSubjects,
                avgAccuracy: avgScore[0]?.avg?.toFixed(1) || 0,
                subjectStats: subjectStats.slice(0, 5), // Legacy for Dashboard Most Attempted
                mostAttemptedSubject: subjectStats[0] || null,
                hardestSubject: subjectPerformance[0] || null,
                subjectDistribution,
                attemptsTrend,
                subjectPerformance, // correct Rates
                attemptSubjectStats, // avg scores from attempts
                hardestQuestions,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/users/:id/analytics */
const getStudentAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await User.findById(id).select('name email avatar');
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        const attempts = await Attempt.find({ userId: id }).sort({ createdAt: -1 });
        
        const totalAttempts = attempts.length;
        const avgScore = totalAttempts > 0 ? (attempts.reduce((acc, curr) => acc + curr.accuracy, 0) / totalAttempts).toFixed(1) : 0;
        
        let subjectStats = {};
        attempts.forEach(a => {
            let s = a.subject || 'Mixed';
            if (!subjectStats[s]) subjectStats[s] = { totalAccuracy: 0, count: 0 };
            subjectStats[s].totalAccuracy += a.accuracy;
            subjectStats[s].count += 1;
        });

        let strongSubject = '-';
        let weakSubject = '-';
        let highest = -1;
        let lowest = 101;

        Object.keys(subjectStats).forEach(sub => {
            const avg = subjectStats[sub].totalAccuracy / subjectStats[sub].count;
            if (avg > highest) { highest = avg; strongSubject = sub; }
            if (avg < lowest) { lowest = avg; weakSubject = sub; }
        });

        res.json({
            success: true,
            analytics: {
                student,
                totalAttempts,
                avgScore,
                strongSubject,
                weakSubject,
                lastAttempt: attempts[0] || null,
                attemptHistory: attempts.slice(0, 10).map(a => ({
                    _id: a._id,
                    subject: a.subject,
                    accuracy: a.accuracy,
                    score: a.score,
                    maxScore: a.maxScore,
                    date: a.createdAt
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** DELETE /api/admin/questions/subject/:subject */
const deleteQuestionsBySubject = async (req, res) => {
    try {
        const { subject } = req.params;
        if (!subject) return res.status(400).json({ success: false, message: 'Subject is required' });
        
        const result = await Question.deleteMany({ subject });
        res.json({ success: true, message: `Deleted ${result.deletedCount} questions for subject ${subject}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/subjects */
const getSubjects = async (req, res) => {
    try {
        const subjects = await Question.aggregate([
            { $group: { _id: '$subject', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json({ success: true, subjects: subjects.map(s => s._id), subjectCounts: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ════════════════════════════════════════════════════════════════════════════
// EXAM SESSION MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

/** Generate a unique session code like MCQ-X8R4 */
const generateSessionCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MCQ-';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
};

/** POST /api/admin/bulk-create-students */
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
                role: 'exam-student',
                isActive: true,
                studentId: s.studentId,
                seatNumber: s.seatNumber,
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

        // Build credentials XLSX in memory
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
            message: `${created.length} students created, ${skipped.length} skipped (already exist)`,
            created,
            skipped,
            credentialsBase64: xlsxBuffer.toString('base64'),
            errors,
        });
    } catch (error) {
        console.error('Bulk create students error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/admin/exam-sessions */
const createExamSession = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Questions file is required' });

        const { title, subject, duration, negativeMarking, allowedStudentIds } = req.body;
        if (!title || !subject) return res.status(400).json({ success: false, message: 'Title and subject are required' });

        const { questions, errors } = parseSessionQuestionsExcel(req.file.buffer);
        if (questions.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid questions found in file', errors });
        }

        // Generate unique code
        let sessionCode;
        let attempts = 0;
        do {
            sessionCode = generateSessionCode();
            attempts++;
        } while (await ExamSession.findOne({ sessionCode }) && attempts < 20);

        // Parse allowed students
        let allowedStudents = [];
        if (allowedStudentIds) {
            try { allowedStudents = JSON.parse(allowedStudentIds); } catch { allowedStudents = []; }
        }

        const session = await ExamSession.create({
            sessionCode,
            title,
            subject,
            questions,
            duration: parseInt(duration) || 60,
            negativeMarking: negativeMarking === 'true',
            allowedStudents,
            createdBy: req.user._id,
        });

        res.status(201).json({ success: true, session, sessionCode });
    } catch (error) {
        console.error('Create exam session error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/exam-sessions */
const getExamSessions = async (req, res) => {
    try {
        const sessions = await ExamSession.find()
            .select('-questions')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        // Attach attempt counts
        const sessionsWithCounts = await Promise.all(sessions.map(async (s) => {
            const attemptCount = await Attempt.countDocuments({ sessionCode: s.sessionCode });
            return { ...s.toObject(), attemptCount };
        }));

        res.json({ success: true, sessions: sessionsWithCounts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/exam-sessions/:id */
const getExamSession = async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.id).populate('allowedStudents', 'name email');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        res.json({ success: true, session });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/admin/exam-sessions/:id/toggle-active */
const toggleSessionActive = async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        session.isActive = !session.isActive;
        await session.save();
        res.json({ success: true, isActive: session.isActive, message: `Exam ${session.isActive ? 'opened' : 'closed'}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/admin/exam-sessions/:id/toggle-results */
const toggleSessionResults = async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        session.showResults = !session.showResults;
        await session.save();
        res.json({ success: true, showResults: session.showResults, message: `Results ${session.showResults ? 'released' : 'hidden'}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/exam-sessions/:id/results */
const getSessionResults = async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.id).select('sessionCode title subject');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const attempts = await Attempt.find({ sessionCode: session.sessionCode })
            .populate('userId', 'name email')
            .sort({ score: -1 });

        const results = attempts.map((a, i) => ({
            rank: i + 1,
            studentName: a.userId?.name || 'Unknown',
            email: a.userId?.email || '',
            score: a.score,
            maxScore: a.maxScore,
            accuracy: a.accuracy,
            correctCount: a.correctCount,
            wrongCount: a.wrongCount,
            skippedCount: a.skippedCount,
            timeTaken: a.timeTaken,
            submittedAt: a.createdAt,
        }));

        res.json({ success: true, session: { title: session.title, subject: session.subject, code: session.sessionCode }, results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/exam-sessions/:id/export */
const exportSessionResults = async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.id).select('sessionCode title subject');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const attempts = await Attempt.find({ sessionCode: session.sessionCode })
            .populate('userId', 'name email')
            .sort({ score: -1 });

        const rows = attempts.map((a, i) => ({
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

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Results');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="results_${session.sessionCode}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/download-sample/:type */
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
                    'SEAT NUMBER': 'S101'
                }, 
                { 
                    'STUDENT ID': '2024-CSC-002', 
                    'NAME': 'Jane Smith', 
                    'EMAIL': '',
                    'DEPARTMENT': 'Computer Science',
                    'SEMESTER': '4',
                    'SEAT NUMBER': ''
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
        } else {
            return res.status(400).json({ success: false, message: 'Invalid sample type' });
        }

        const { generateExcel } = require('../utils/exportHelpers');
        const buffer = generateExcel(data, 'SampleData');

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        console.log(`Sending Excel file: ${filename} (${buffer.length} bytes)`);
        return res.status(200).end(buffer);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** DELETE /api/admin/exam-sessions/:id */
const deleteExamSession = async (req, res) => {
    try {
        const session = await ExamSession.findByIdAndDelete(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        res.json({ success: true, message: 'Exam session deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/admin/eligible-students */
const getEligibleStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'exam-student', isActive: true })
            .select('name email studentId department semester')
            .sort({ department: 1, semester: 1, name: 1 });
        res.json({ success: true, students });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    uploadQuestions, getQuestions, updateQuestion, deleteQuestion,
    getUsers, updateUserRole, toggleUserActive, getDashboardStats, getSubjects,
    getStudentAnalytics, deleteQuestionsBySubject,
    // Exam session
    bulkCreateStudents, createExamSession, getExamSessions, getExamSession,
    toggleSessionActive, toggleSessionResults, getSessionResults, exportSessionResults,
    deleteExamSession, downloadSampleExcel, getEligibleStudents,
};
