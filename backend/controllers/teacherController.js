const ExamSession = require('../models/ExamSession');
const StudentExamProgress = require('../models/StudentExamProgress');
const Attempt = require('../models/Attempt');
const User = require('../models/User');
const Question = require('../models/Question');
const { seededShuffle } = require('../utils/shuffle');
const { getStudentTestCode } = require('../utils/testCodeHelper');
const { parseExcel } = require('../utils/excelParser');
const { logAction } = require('../utils/auditLogger');

// ── Question Bank Management ─────────────────────────────────────────────────

/** POST /api/teacher/questions/upload */
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

        await logAction({
            userId: req.user._id,
            action: 'CREATE',
            targetModel: 'Question',
            details: `Bulk uploaded ${inserted.length} questions`
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

/** GET /api/teacher/questions */
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

/** PUT /api/teacher/questions/:id */
const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findOneAndUpdate(
            { _id: req.params.id, collegeId: req.user.collegeId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

        await logAction({
            userId: req.user._id,
            action: 'UPDATE',
            targetModel: 'Question',
            targetId: question._id,
            details: `Updated question: ${question.question.substring(0, 30)}...`
        });

        res.json({ success: true, question });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** DELETE /api/teacher/questions/:id */
const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findOneAndUpdate(
            { _id: req.params.id, collegeId: req.user.collegeId },
            { isDeleted: true, deletedAt: new Date() }
        );
        if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'Question',
            targetId: question._id,
            details: `Deleted question: ${question.question.substring(0, 30)}...`
        });

        res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** DELETE /api/teacher/questions/by-subject?subject=X */
const deleteQuestionsBySubject = async (req, res) => {
    try {
        const { subject } = req.query;
        if (!subject) return res.status(400).json({ success: false, message: 'Subject is required' });
        const result = await Question.updateMany(
            { collegeId: req.user.collegeId, subject, isDeleted: false },
            { isDeleted: true, deletedAt: new Date() }
        );
        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'Question',
            details: `Bulk deleted ${result.modifiedCount} questions from subject "${subject}"`
        });
        res.json({ success: true, message: `${result.modifiedCount} questions deleted from subject "${subject}"`, deletedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Exam CRUD ────────────────────────────────────────────────────────────────

/**
 * Helper: returns true if the current user created the exam OR is assigned to it.
 * Used universally so college-admin-created exams are visible to assigned teachers.
 */
const canAccessExam = (exam, userId) => {
    if (!exam) return false;
    const uid = String(userId);
    if (String(exam.createdBy?._id || exam.createdBy) === uid) return true;
    if (exam.assignedTeachers?.some(t => String(t._id || t) === uid)) return true;
    return false;
};

/** GET /api/teacher/exams */
const getMyExams = async (req, res) => {
    try {
        const exams = await ExamSession.find({
            $or: [
                { createdBy: req.user._id },
                { assignedTeachers: req.user._id },
            ],
            collegeId: req.user.collegeId,
            isDeleted: false,
        })
            .populate('createdBy', 'name')
            .populate('assignedTeachers', 'name')
            .sort('-createdAt')
            .lean();
        res.json({ success: true, exams });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** POST /api/teacher/exams */
const createExam = async (req, res) => {
    try {
        const { title, subject, description, type, questions = [], questionIds = [], duration, passingMarks, negativeMarking, date, allowedStudentIds } = req.body;
        if (!title || !subject) return res.status(400).json({ success: false, message: 'Title and subject required' });

        let examQuestions = [];
        let allowedStudents = [];
        // Accept as array directly (JSON body from teacher wizard)
        if (Array.isArray(req.body.allowedStudents) && req.body.allowedStudents.length > 0) {
            allowedStudents = req.body.allowedStudents;
        }
        // Accept as JSON string (FormData from college admin)
        else if (allowedStudentIds) {
            try { allowedStudents = JSON.parse(allowedStudentIds); } catch { allowedStudents = []; }
        }

        // 1. If inline questions are provided (Old GUI style)
        if (questions?.length > 0) {
            examQuestions = questions.map(q => {
                // correctAnswer may come as number (0-3) from wizard, or as letter ('A'-'D') from other flows
                let correctAnswer = q.correctAnswer;
                if (typeof correctAnswer === 'number') {
                    correctAnswer = ['A', 'B', 'C', 'D'][correctAnswer] || 'A';
                }
                return {
                    question: q.questionText || q.question,
                    options: q.options,
                    correctAnswer,
                    subject: q.subject || subject,
                    cos: q.cos,
                    marks: q.points || q.marks || 1
                };
            });
        }
        // 2. If selecting from bank
        else if (questionIds?.length > 0) {
            const bankQuestions = await Question.find({ _id: { $in: questionIds }, collegeId: req.user.collegeId, isDeleted: false }).lean();
            examQuestions = bankQuestions.map(q => ({
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                subject: q.subject,
                subject: q.subject,
                cos: q.cos,
                marks: q.marks
            }));
        }

        const sessionCode = `EX${Date.now().toString(36).toUpperCase()}`;
        const testCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit random number

        const exam = await ExamSession.create({
            sessionCode,
            testCode,
            title,
            subject,
            description: description || '',
            type: type || 'exam',
            questions: examQuestions,
            duration: duration || 60,
            passingMarks: passingMarks || 50,
            negativeMarking: negativeMarking || false,
            date: date || new Date(),
            allowedStudents,
            collegeId: req.user.collegeId,
            createdBy: req.user._id,
            createdByRole: req.user.role,
        });

        await logAction({
            userId: req.user._id,
            action: 'CREATE',
            targetModel: 'ExamSession',
            targetId: exam._id,
            details: `Created exam: ${exam.title} (${exam.sessionCode})`
        });

        res.status(201).json({ success: true, message: 'Exam created', exam });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PUT /api/teacher/exams/:id */
const updateExam = async (req, res) => {
    try {
        const exam = await ExamSession.findOne({ _id: req.params.id, isDeleted: false });
        if (!exam || !canAccessExam(exam, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Exam not found or access denied' });
        }

        const allowed = ['title', 'subject', 'description', 'type', 'duration', 'passingMarks', 'negativeMarking', 'isActive', 'showResults', 'showQA'];
        allowed.forEach((field) => { if (req.body[field] !== undefined) exam[field] = req.body[field]; });

        // Allow updating assignedTeachers (only the creator can do this)
        if (req.body.assignedTeachers !== undefined && String(exam.createdBy) === String(req.user._id)) {
            exam.assignedTeachers = req.body.assignedTeachers;
        }

        await exam.save();

        await logAction({
            userId: req.user._id,
            action: 'UPDATE',
            targetModel: 'ExamSession',
            targetId: exam._id,
            details: `Updated exam: ${exam.title}`
        });

        res.json({ success: true, message: 'Exam updated', exam });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** DELETE /api/teacher/exams/:id (soft) — only creator can delete */
const deleteExam = async (req, res) => {
    try {
        const exam = await ExamSession.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user._id, collegeId: req.user.collegeId },
            { isDeleted: true, deletedAt: new Date() }
        );
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found or you are not the creator' });

        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'ExamSession',
            targetId: exam._id,
            details: `Deleted exam: ${exam.title}`
        });

        res.json({ success: true, message: 'Exam deleted' });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** GET /api/teacher/exams/:id */
const getExamById = async (req, res) => {
    try {
        const exam = await ExamSession.findOne({ _id: req.params.id, isDeleted: false })
            .populate('allowedStudents', 'name email studentId department semester')
            .populate('assignedTeachers', 'name email')
            .populate('createdBy', 'name email')
            .lean();
        if (!exam || !canAccessExam(exam, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Exam not found or access denied' });
        }

        // Also fetch progress for all students in this exam
        const progressList = await StudentExamProgress.find({ examSessionId: req.params.id }).lean();

        res.json({ success: true, exam, progress: progressList });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── Student Management ────────────────────────────────────────────────────────

/** PUT /api/teacher/exams/:id/students */
const updateExamStudents = async (req, res) => {
    try {
        const { addStudents = [], removeStudents = [] } = req.body;
        const exam = await ExamSession.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

        if (addStudents.length) {
            exam.allowedStudents = [...new Set([...exam.allowedStudents.map(String), ...addStudents])];
        }
        if (removeStudents.length) {
            exam.allowedStudents = exam.allowedStudents.filter((s) => !removeStudents.includes(String(s)));
        }
        await exam.save();
        res.json({ success: true, message: 'Students updated', count: exam.allowedStudents.length });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── Results ───────────────────────────────────────────────────────────────────

/** GET /api/teacher/exams/:id/results */
const getExamResults = async (req, res) => {
    try {
        const exam = await ExamSession.findOne({ _id: req.params.id, isDeleted: false });
        if (!exam || !canAccessExam(exam, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Exam not found or access denied' });
        }

        const results = await Attempt.find({ examSessionId: req.params.id, mode: 'exam', isDeleted: false })
            .populate('userId', 'name email studentId semester department')
            .sort('-score')
            .lean();

        res.json({ success: true, results });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

/** GET /api/teacher/exams/:id/analytics */
const getExamAnalytics = async (req, res) => {
    try {
        const exam = await ExamSession.findOne({ _id: req.params.id, isDeleted: false });
        if (!exam || !canAccessExam(exam, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Exam not found or access denied' });
        }

        const results = await Attempt.find({ examSessionId: req.params.id, mode: 'exam', isDeleted: false })
            .populate('userId', 'name email')
            .lean();

        if (!results.length) return res.json({ success: true, analytics: null, message: 'No results yet' });

        const total = results.length;
        const passed = results.filter((r) => r.passed).length;
        const failed = total - passed;
        const avgScore = results.reduce((sum, r) => sum + r.percentage, 0) / total;
        const topStudents = [...results].sort((a, b) => b.score - a.score).slice(0, 5).map((r) => ({
            name: r.userId?.name,
            email: r.userId?.email,
            score: r.score,
            percentage: r.percentage,
        }));
        const avgTimeTaken = results.reduce((sum, r) => sum + r.timeTaken, 0) / total;

        // Enhanced Analytics logic
        const coStatsMap = {}; // { coName: { correct: 0, total: 0 } }
        const questionStats = exam.questions.map((q, qIdx) => {
            let correctCount = 0;
            results.forEach(res => {
                const ans = res.answers[qIdx];
                if (ans && ans.isCorrect) correctCount++;
            });

            const successRate = total > 0 ? (correctCount / total) * 100 : 0;

            // Map to COs
            if (q.cos && typeof q.cos === 'string') {
                const coList = q.cos.split(',').map(s => s.trim()).filter(Boolean);
                coList.forEach(co => {
                    if (!coStatsMap[co]) coStatsMap[co] = { name: co, correct: 0, total: 0 };
                    coStatsMap[co].correct += correctCount;
                    coStatsMap[co].total += total;
                });
            }

            return {
                index: qIdx + 1,
                question: q.question,
                correctCount,
                successRate: Math.round(successRate),
            };
        });

        const coStats = Object.values(coStatsMap).map(co => ({
            name: co.name,
            accuracy: co.total > 0 ? Math.round((co.correct / co.total) * 100) : 0
        }));

        const scoreDistribution = [
            { range: '0-20%', count: results.filter(r => r.percentage < 20).length },
            { range: '20-40%', count: results.filter(r => r.percentage >= 20 && r.percentage < 40).length },
            { range: '40-60%', count: results.filter(r => r.percentage >= 40 && r.percentage < 60).length },
            { range: '60-80%', count: results.filter(r => r.percentage >= 60 && r.percentage < 80).length },
            { range: '80-100%', count: results.filter(r => r.percentage >= 80).length },
        ];

        const timeDistribution = [
            { range: '0-10 min', count: results.filter((r) => r.timeTaken < 600).length },
            { range: '10-20 min', count: results.filter((r) => r.timeTaken >= 600 && r.timeTaken < 1200).length },
            { range: '20-30 min', count: results.filter((r) => r.timeTaken >= 1200 && r.timeTaken < 1800).length },
            { range: '30+ min', count: results.filter((r) => r.timeTaken >= 1800).length },
        ];

        res.json({
            success: true,
            analytics: {
                total, passed, failed,
                passRate: ((passed / total) * 100).toFixed(1),
                failRate: ((failed / total) * 100).toFixed(1),
                avgScore: avgScore.toFixed(1),
                avgTimeTaken: Math.round(avgTimeTaken / 60), // minutes
                topStudents,
                scoreDistribution,
                timeDistribution,
                questionStats,
                coStats
            },
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Export ────────────────────────────────────────────────────────────────────

/** GET /api/teacher/exams/:id/export?format=excel|csv|pdf */
const exportExamResults = async (req, res) => {
    try {
        const { generateExcel, generateCSV, generatePDF } = require('../utils/exportHelpers');
        const format = req.query.format || 'excel';

        const exam = await ExamSession.findOne({ _id: req.params.id, isDeleted: false });
        if (!exam || !canAccessExam(exam, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Exam not found or access denied' });
        }

        const results = await Attempt.find({ examSessionId: req.params.id, mode: 'exam', isDeleted: false })
            .populate('userId', 'name email studentId semester department')
            .lean();

        // Custom sorting for Marksheet format (by Student ID)
        if (format === 'marksheet') {
            results.sort((a, b) => {
                const idA = String(a.userId?.studentId || '').toLowerCase();
                const idB = String(b.userId?.studentId || '').toLowerCase();
                return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
            });
        } else {
            // Default sort: by score descending
            results.sort((a, b) => b.score - a.score);
        }

        let data = [];
        if (format === 'marksheet') {
            data = results.map(r => ({
                ID: r.userId?.studentId || 'N/A',
                NAME: r.userId?.name || 'N/A',
                MARKS: r.score,
            }));
        } else {
            data = results.map((r, i) => ({
                Rank: i + 1,
                'Student Name': r.userId?.name || 'N/A',
                Email: r.userId?.email || '',
                'Student ID': r.userId?.studentId || '',
                Semester: r.userId?.semester || '',
                Department: r.userId?.department || '',
                Score: r.score,
                'Max Score': r.maxScore,
                Percentage: `${r.percentage?.toFixed(1)}%`,
                Passed: r.passed ? 'Yes' : 'No',
                Correct: r.correctCount,
                Wrong: r.wrongCount,
                Skipped: r.skippedCount,
                'Time (min)': Math.round(r.timeTaken / 60),
                'Auto Submitted': r.autoSubmitted ? 'Yes' : 'No',
                Date: new Date(r.createdAt).toLocaleDateString(),
            }));
        }

        if (format === 'csv') {
            const csv = generateCSV(data);
            res.setHeader('Content-Disposition', `attachment; filename="${exam.title}_results.csv"`);
            res.setHeader('Content-Type', 'text/csv');
            return res.send(csv);
        }

        if (format === 'pdf') {
            const pdf = await generatePDF(data, `${exam.title} — Results`);
            res.setHeader('Content-Disposition', `attachment; filename="${exam.title}_results.pdf"`);
            res.setHeader('Content-Type', 'application/pdf');
            return res.send(pdf);
        }

        // Default: Excel
        const buffer = generateExcel(data, 'Results');
        res.setHeader('Content-Disposition', `attachment; filename="${exam.title}_results.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};



/** GET /api/teacher/students — list students in college */
const getCollegeStudents = async (req, res) => {
    try {
        const students = await User.find({ collegeId: req.user.collegeId, role: 'student', isDeleted: false, isActive: true })
            .select('name email studentId semester department')
            .lean();
        res.json({ success: true, students });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** GET /api/teacher/dashboard */
const getDashboard = async (req, res) => {
    try {
        const totalExams = await ExamSession.countDocuments({ createdBy: req.user._id, isDeleted: false });
        const activeExams = await ExamSession.countDocuments({ createdBy: req.user._id, isActive: true, isDeleted: false });
        const totalResults = await Attempt.countDocuments({ collegeId: req.user.collegeId, mode: 'exam', isDeleted: false });
        const passedResults = await Attempt.countDocuments({ collegeId: req.user.collegeId, mode: 'exam', passed: true, isDeleted: false });

        res.json({
            success: true,
            dashboard: {
                totalExams, activeExams,
                totalStudentsTested: totalResults,
                overallPassRate: totalResults > 0 ? ((passedResults / totalResults) * 100).toFixed(1) : 0,
            },
        });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/** GET /api/teacher/analytics (General) */
const getGeneralAnalytics = async (req, res) => {
    try {
        const exams = await ExamSession.find({ createdBy: req.user._id, isDeleted: false }).select('_id title').lean();
        const examIds = exams.map(e => e._id);

        const attempts = await Attempt.find({ examSessionId: { $in: examIds }, mode: 'exam', isDeleted: false })
            .select('userId examSessionId score percentage passed createdAt')
            .populate('userId', 'name')
            .sort('-createdAt')
            .lean();

        const totalAttempts = attempts.length;
        const totalPassed = attempts.filter(a => a.passed).length;
        const avgScore = totalAttempts > 0 ? (attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts) : 0;

        const recentAttempts = attempts.map(a => ({
            studentName: a.userId?.name || 'Unknown',
            examTitle: exams.find(e => e._id.toString() === a.examSessionId.toString())?.title || 'Unknown',
            score: a.percentage.toFixed(1),
            passed: a.passed,
            date: a.createdAt
        })).slice(0, 20);

        res.json({
            success: true,
            stats: {
                totalAttempts,
                avgScore,
                passingRate: totalAttempts > 0 ? (totalPassed / totalAttempts * 100) : 0,
                recentAttempts
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/teacher/export-results */
const exportAllResults = async (req, res) => {
    try {
        const { generateExcel, generatePDF } = require('../utils/exportHelpers');
        const format = req.query.format || 'excel';

        const exams = await ExamSession.find({ createdBy: req.user._id, isDeleted: false }).select('_id title').lean();
        const examIds = exams.map(e => e._id);

        const attempts = await Attempt.find({ examSessionId: { $in: examIds }, mode: 'exam', isDeleted: false })
            .populate('userId', 'name email studentId semester department')
            .sort('-createdAt')
            .lean();

        const data = attempts.map((r, i) => ({
            'Student Name': r.userId?.name || 'N/A',
            Email: r.userId?.email || '',
            'Exam Title': exams.find(e => e._id.toString() === r.examSessionId.toString())?.title || 'Unknown',
            Score: `${r.percentage?.toFixed(1)}%`,
            Passed: r.passed ? 'Yes' : 'No',
            Date: new Date(r.createdAt).toLocaleDateString(),
        }));

        if (format === 'pdf') {
            const pdf = await generatePDF(data, 'All Exam Results');
            res.setHeader('Content-Disposition', 'attachment; filename="all_results.pdf"');
            res.setHeader('Content-Type', 'application/pdf');
            return res.send(pdf);
        }

        const buffer = generateExcel(data, 'Results');
        res.setHeader('Content-Disposition', 'attachment; filename="all_results.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};

/** POST /api/teacher/bulk-parse-questions */
const bulkParseQuestions = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const { parseSessionQuestionsExcel } = require('../utils/excelParser');
        const { questions, errors } = parseSessionQuestionsExcel(req.file.buffer);

        if (questions.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid questions found', errors });
        }

        res.json({ success: true, questions, errors });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Error parsing file' });
    }
};

/** GET /api/teacher/download-sample */
const downloadSampleQuestions = async (req, res) => {
    try {
        const { generateExcel } = require('../utils/exportHelpers');
        const data = [{
            'QUESTION': 'What is the capital of France?',
            'OPTION A': 'London', 'OPTION B': 'Paris', 'OPTION C': 'Berlin', 'OPTION D': 'Madrid',
            'ANSWER': 'B', 'SUBJECT': 'Geography', 'COs': 'CO1, CO2', 'MARKS': 1
        }, {
            'QUESTION': '2 + 2 = ?',
            'OPTION A': '3', 'OPTION B': '4', 'OPTION C': '5', 'OPTION D': '6',
            'ANSWER': 'B', 'SUBJECT': 'Math', 'COs': 'CO3', 'MARKS': 1
        }];

        const buffer = generateExcel(data, 'SampleQuestions');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="exam_questions_sample.xlsx"');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        console.log(`Sending Teacher Sample Excel: ${buffer.length} bytes`);
        return res.status(200).end(buffer);
    } catch (e) {
        console.error('Download sample error:', e);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/teacher/subjects — list subjects from the question bank */
const getTeacherSubjects = async (req, res) => {
    try {
        const subjects = await Question.aggregate([
            { $match: { collegeId: req.user.collegeId, isDeleted: false } },
            { $group: { _id: '$subject', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json({ success: true, subjects: subjects.map(s => s._id), subjectCounts: subjects });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/teacher/attempts/:id */
const getAttemptDetails = async (req, res) => {
    try {
        const attempt = await Attempt.findOne({ _id: req.params.id }).populate('userId', 'name studentId');
        if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

        const exam = await ExamSession.findOne({ _id: attempt.examSessionId });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam session not found' });

        // Rebuild shuffled questions to match indices if it's a session attempt
        let questions = exam.questions;
        if (attempt.sessionCode) {
            const seed = attempt.userId._id.toString() + attempt.sessionCode;
            questions = seededShuffle(exam.questions, seed);
        }

        res.json({ success: true, attempt, questions });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/teacher/attempts/:id/answers/:index */
const updateAttemptAnswer = async (req, res) => {
    try {
        const { isCorrect, correctOption } = req.body;
        const attempt = await Attempt.findById(req.params.id);
        if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

        const idx = parseInt(req.params.index);
        if (isNaN(idx) || idx < 0 || idx >= attempt.answers.length) {
            return res.status(400).json({ success: false, message: 'Invalid answer index' });
        }

        // Update the specific answer logic
        if (correctOption) {
            attempt.answers[idx].correctOption = correctOption;
            // Re-evaluate if student's selection now matches the NEW correct option
            attempt.answers[idx].isCorrect = attempt.answers[idx].selectedOption === correctOption;
        } else if (isCorrect !== undefined) {
            // Manual override of correctness status
            attempt.answers[idx].isCorrect = isCorrect;
        }

        // Mark the individual answer subdocument as modified
        attempt.markModified('answers');

        // Re-calculate aggregations
        let newScore = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let skippedCount = 0;

        attempt.answers.forEach(ans => {
            const marks = ans.marks || 1;
            if (ans.isCorrect) {
                correctCount++;
                newScore += marks;
            } else if (ans.selectedOption === null) {
                skippedCount++;
            } else {
                wrongCount++;
                if (attempt.negativeMarking) newScore -= marks * 0.25;
            }
        });

        attempt.score = Math.max(0, Math.round(newScore * 100) / 100);
        attempt.correctCount = correctCount;
        attempt.wrongCount = wrongCount;
        attempt.skippedCount = skippedCount;

        if (attempt.maxScore > 0) {
            attempt.percentage = (attempt.score / attempt.maxScore) * 100;
            attempt.accuracy = attempt.percentage;
        }

        // Re-check passed status
        const exam = await ExamSession.findById(attempt.examSessionId);
        if (exam) {
            attempt.passed = attempt.percentage >= (exam.passingMarks || 50);
        }

        await attempt.save();
        res.json({ success: true, message: 'Attempt updated', attempt });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/teacher/exams/:id/test-code-excel */
const downloadExamTestCodeExcel = async (req, res) => {
    try {
        const exam = await ExamSession.findById(req.params.id)
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
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Students Data
        let students = [];
        if (exam.allowedStudents && exam.allowedStudents.length > 0) {
            students = exam.allowedStudents;
        } else {
            // If no specific students, get all from college
            const User = require('../models/User'); // Assuming User model is available
            students = await User.find({ collegeId: exam.collegeId, role: 'student', isDeleted: false }, 'name studentId email').lean();
        }

        students.forEach((s, i) => {
            const studentCode = getStudentTestCode(String(s._id), String(exam._id), exam.testCode);
            const row = worksheet.addRow([i + 1, s.name, s.studentId || s.email, studentCode]);
            row.alignment = { vertical: 'middle' };
            row.eachCell(cell => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
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

/** PATCH /api/teacher/exams/:id/students/:studentId/allow-rejoin */
const allowStudentRejoin = async (req, res) => {
    try {
        const { id, studentId } = req.params;

        // Verify the requesting user can access this exam
        const exam = await ExamSession.findOne({ _id: id, isDeleted: false });
        if (!exam || !canAccessExam(exam, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Exam not found or access denied' });
        }

        const progress = await StudentExamProgress.findOne({ examSessionId: id, studentId });
        if (!progress) return res.status(404).json({ success: false, message: 'No progress found for this student' });

        // Reset rejoin count and unblock student
        progress.rejoinCount = 0;
        progress.warningCount = 0;
        progress.status = 'in-progress';
        progress.rejoinToken = null;
        progress.lastActiveAt = new Date();
        await progress.save();

        await logAction({
            userId: req.user._id,
            action: 'UPDATE',
            targetModel: 'StudentExamProgress',
            targetId: progress._id,
            details: `Allowed rejoin for student ${studentId} in exam ${id} (rejoin & warning counts reset)`
        });

        res.json({ success: true, message: 'Student can rejoin. Rejoin and warning counts have been reset.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * PATCH /api/teacher/exams/:id/students/:studentId/reset
 * Fully resets a student's exam — deletes their progress and any submitted attempt,
 * allowing them to start the exam completely from scratch.
 */
const resetStudentExam = async (req, res) => {
    try {
        const { id, studentId } = req.params;

        // Verify the requesting user can access this exam
        const exam = await ExamSession.findOne({ _id: id, isDeleted: false });
        if (!exam || !canAccessExam(exam, req.user._id)) {
            return res.status(404).json({ success: false, message: 'Exam not found or access denied' });
        }

        // Delete in-progress session data
        const deletedProgress = await StudentExamProgress.findOneAndDelete({ examSessionId: id, studentId });

        // Soft-delete any submitted attempt(s) so leaderboard is clean
        const deletedAttempt = await Attempt.updateMany(
            { examSessionId: id, userId: studentId, isDeleted: false },
            { isDeleted: true, deletedAt: new Date() }
        );

        await logAction({
            userId: req.user._id,
            action: 'DELETE',
            targetModel: 'StudentExamProgress',
            targetId: deletedProgress?._id,
            details: `Reset exam for student ${studentId} in exam ${id} — progress deleted, ${deletedAttempt.modifiedCount} attempt(s) removed`
        });

        res.json({
            success: true,
            message: 'Student exam has been fully reset. They can now start the exam fresh.',
            attemptsRemoved: deletedAttempt.modifiedCount,
            progressDeleted: !!deletedProgress,
        });
    } catch (e) {
        console.error('Reset student exam error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    // Question Bank
    uploadQuestions, getQuestions, updateQuestion, deleteQuestion, deleteQuestionsBySubject,
    // Exams
    getMyExams, createExam, updateExam, deleteExam, getExamById,
    // Exam Students
    updateExamStudents, getCollegeStudents,
    // Dashboard & Subjects
    getDashboard, getTeacherSubjects,
    // Excel upload for Exams
    bulkParseQuestions, downloadSampleQuestions, downloadExamTestCodeExcel,
    // Results & Analytics
    getExamResults, getExamAnalytics, getGeneralAnalytics, exportAllResults, exportExamResults,
    // Attempt Management
    getAttemptDetails, updateAttemptAnswer,
    // Student Exam Progress Management
    allowStudentRejoin, resetStudentExam,
};
