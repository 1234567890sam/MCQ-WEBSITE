const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const User = require('../models/User');
const College = require('../models/College');
const { generateResultPDF } = require('../utils/pdfGenerator');
const { seededShuffle } = require('../utils/shuffle');

/** GET /api/student/practice */
const getPracticeQuestions = async (req, res) => {
    try {
        // Fetch college to check practice mode permission
        const college = await College.findById(req.user.collegeId);
        if (!college || !college.isActive) {
            return res.status(403).json({ success: false, message: 'Your college account is inactive.' });
        }
        if (college.features && college.features.practiceMode === false) {
            return res.status(403).json({ success: false, message: 'Practice mode is disabled by your administrator.' });
        }

        const { subject, count = 10 } = req.query;
        // Filter by student's college ONLY
        const filter = { collegeId: req.user.collegeId, isDeleted: false };
        if (subject && subject !== 'All') filter.subject = subject;

        const questions = await Question.aggregate([
            { $match: filter },
            { $sample: { size: parseInt(count) } },
            { $project: { createdBy: 0, timesAttempted: 0, timesCorrect: 0 } },
        ]);

        if (questions.length === 0) {
            return res.status(404).json({ success: false, message: 'No questions found for the given filters' });
        }

        res.json({ success: true, questions, total: questions.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/student/submit-exam */
const submitExam = async (req, res) => {
    try {
        const { answers, timeTaken, mode = 'exam', negativeMarking = false } = req.body;

        if (mode === 'practice' || mode === 'exam') {
            const college = await College.findById(req.user.collegeId);
            if (!college || !college.isActive) {
                return res.status(403).json({ success: false, message: 'Your college account is inactive.' });
            }
            if (college.features && college.features.practiceMode === false) {
                return res.status(403).json({ success: false, message: 'This mode is currently disabled by your administrator.' });
            }
        }

        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ success: false, message: 'Answers are required' });
        }

        // Fetch all questions
        const questionIds = answers.map((a) => a.questionId);
        const questions = await Question.find({ _id: { $in: questionIds } });
        const questionMap = {};
        questions.forEach((q) => { questionMap[q._id.toString()] = q; });

        let score = 0;
        let maxScore = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let skippedCount = 0;
        const subjectPerformance = {};

        const processedAnswers = answers.map((ans) => {
            const question = questionMap[ans.questionId];
            if (!question) return null;

            const marks = question.marks || 1;
            maxScore += marks;
            const isCorrect = ans.selectedOption === question.correctAnswer;
            const isSkipped = !ans.selectedOption;

            if (isSkipped) {
                skippedCount++;
            } else if (isCorrect) {
                correctCount++;
                score += marks;
            } else {
                wrongCount++;
                if (negativeMarking) score -= marks * 0.25; // 25% negative marking
            }

            // Track per-subject performance
            const subj = question.subject;
            if (!subjectPerformance[subj]) subjectPerformance[subj] = { correct: 0, total: 0 };
            subjectPerformance[subj].total++;
            if (isCorrect) subjectPerformance[subj].correct++;

            // Update question stats
            Question.findByIdAndUpdate(question._id, {
                $inc: { timesAttempted: 1, timesCorrect: isCorrect ? 1 : 0 },
            }).exec();

            return {
                questionId: question._id,
                selectedOption: ans.selectedOption || null,
                correctOption: question.correctAnswer,
                isCorrect,
                marks,
            };
        }).filter(Boolean);

        const accuracy = maxScore > 0 ? Math.max(0, (score / maxScore) * 100) : 0;
        const passed = accuracy >= 40; // Default 40% passing for practice/standard mode

        // Determine weak subjects (< 50% accuracy)
        const weakSubjects = Object.entries(subjectPerformance)
            .filter(([, data]) => data.total > 0 && data.correct / data.total < 0.5)
            .map(([subj]) => subj);

        const attempt = await Attempt.create({
            userId: req.user._id,
            collegeId: req.user.collegeId,
            mode,
            subject: req.body.subject || 'Mixed',
            answers: processedAnswers,
            score: Math.max(0, Math.round(score * 100) / 100),
            maxScore,
            accuracy: parseFloat(accuracy.toFixed(2)),
            percentage: parseFloat(accuracy.toFixed(2)),
            passed,
            totalQuestions: processedAnswers.length,
            correctCount,
            wrongCount,
            skippedCount,
            timeTaken: parseInt(timeTaken) || 0,
            weakSubjects,
            negativeMarking,
        });

        res.status(201).json({ success: true, message: 'Exam submitted', attemptId: attempt._id, attempt });
    } catch (error) {
        console.error('Submit Exam Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/attempts */
const getAttemptHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [attempts, total] = await Promise.all([
            Attempt.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('-answers'),
            Attempt.countDocuments({ userId: req.user._id }),
        ]);

        res.json({ success: true, attempts, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/attempts/:id */
const getAttemptById = async (req, res) => {
    try {
        const attempt = await Attempt.findOne({ _id: req.params.id, userId: req.user._id }).populate(
            'answers.questionId',
            'question options correctAnswer subject marks'
        );
        if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
        res.json({ success: true, attempt });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/dashboard */
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const attempts = await Attempt.find({ userId }).sort({ createdAt: -1 });

        if (attempts.length === 0) {
            return res.json({ success: true, stats: { totalAttempts: 0, avgAccuracy: 0, attempts: [] } });
        }

        const totalAttempts = attempts.length;
        const avgAccuracy = attempts.reduce((sum, a) => sum + a.accuracy, 0) / totalAttempts;

        // Subject performance
        const subjectMap = {};
        attempts.forEach((a) => {
            a.answers.forEach((ans) => {
                // We only have the questionId here (not populated), skip if subject stored on attempt
            });
            const subj = a.subject || 'Mixed';
            if (!subjectMap[subj]) subjectMap[subj] = { correct: 0, total: 0 };
            subjectMap[subj].correct += a.correctCount || 0;
            subjectMap[subj].total += a.totalQuestions || 0;
        });

        const subjectPerformance = Object.entries(subjectMap).map(([subject, data]) => ({
            subject,
            accuracy: data.total > 0 ? ((data.correct / data.total) * 100).toFixed(1) : 0,
        })).sort((a, b) => b.accuracy - a.accuracy);

        const strongSubject = subjectPerformance[0]?.subject || 'N/A';
        const weakSubject = subjectPerformance[subjectPerformance.length - 1]?.subject || 'N/A';

        // Last 7 attempts for chart
        const recentAttempts = attempts.slice(0, 7).reverse().map((a) => ({
            date: a.createdAt,
            accuracy: a.accuracy,
            score: a.score,
            mode: a.mode,
        }));

        res.json({
            success: true,
            stats: {
                totalAttempts,
                avgAccuracy: parseFloat(avgAccuracy.toFixed(1)),
                strongSubject,
                weakSubject,
                recentAttempts,
                subjectPerformance,
                latestAttempts: attempts.slice(0, 5),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/student/bookmarks/:questionId */
const addBookmark = async (req, res) => {
    try {
        const { questionId } = req.params;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { bookmarks: questionId } },
            { new: true }
        ).populate('bookmarks', 'question subject');

        res.json({ success: true, bookmarks: user.bookmarks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** DELETE /api/student/bookmarks/:questionId */
const removeBookmark = async (req, res) => {
    try {
        const { questionId } = req.params;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { bookmarks: questionId } },
            { new: true }
        ).populate('bookmarks', 'question subject');

        res.json({ success: true, bookmarks: user.bookmarks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/bookmarks */
const getBookmarks = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('bookmarks', 'question options correctAnswer subject marks');
        res.json({ success: true, bookmarks: user.bookmarks || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/leaderboard */
const getLeaderboard = async (req, res) => {
    try {
        const { period = 'weekly' } = req.query;
        const now = new Date();
        let startDate;

        if (period === 'weekly') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            startDate = new Date(0); // All time
        }

        const leaderboard = await Attempt.aggregate([
            { $match: { 
                collegeId: req.user.collegeId, 
                createdAt: { $gte: startDate },
                isDeleted: false 
            } },
            {
                $group: {
                    _id: '$userId',
                    totalScore: { $sum: '$score' },
                    avgAccuracy: { $avg: '$accuracy' },
                    totalAttempts: { $sum: 1 },
                },
            },
            { $sort: { totalScore: -1, avgAccuracy: -1 } },
            { $limit: 20 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    name: '$user.name',
                    totalScore: 1,
                    avgAccuracy: { $round: ['$avgAccuracy', 1] },
                    totalAttempts: 1,
                },
            },
        ]);

        res.json({ success: true, leaderboard, period });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/result-pdf/:attemptId */
const downloadResultPDF = async (req, res) => {
    try {
        const attempt = await Attempt.findOne({ _id: req.params.attemptId, userId: req.user._id });
        if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

        let populated = attempt.toObject();
        const OPTS = ['A', 'B', 'C', 'D'];

        if (attempt.sessionCode) {
            // Session-based attempt: Re-shuffle options as the student saw them
            const session = await ExamSession.findOne({ sessionCode: attempt.sessionCode });
            if (session) {
                const seed = req.user._id.toString() + attempt.sessionCode;
                const shuffledQs = seededShuffle(session.questions, seed);
                
                populated.answers.forEach((ans, i) => {
                    const q = shuffledQs[i];
                    if (q) {
                        const studentOptions = seededShuffle(q.options, seed + i);
                        ans.questionText = q.question;
                        
                        // User's selected option text
                        if (ans.selectedOption) {
                            const selIdx = OPTS.indexOf(ans.selectedOption.toUpperCase());
                            ans.selectedText = studentOptions[selIdx] || '—';
                        } else ans.selectedText = 'None';

                        // Correct answer text
                        const correctIdx = OPTS.indexOf(q.correctAnswer.toUpperCase());
                        ans.correctText = q.options[correctIdx] || '—';
                    }
                });
            }
        } else {
            // Normal Attempt: Fetch questions from Question model
            const qIds = attempt.answers.map(a => a.questionId).filter(Boolean);
            const questions = await Question.find({ _id: { $in: qIds } }).lean();
            const qMap = {};
            questions.forEach(q => qMap[q._id.toString()] = q);

            populated.answers.forEach(ans => {
                const q = qMap[ans.questionId?.toString()];
                if (q) {
                    ans.questionText = q.question;
                    const selIdx = OPTS.indexOf(ans.selectedOption?.toUpperCase());
                    ans.selectedText = q.options[selIdx] || 'None';
                    
                    const corIdx = OPTS.indexOf(ans.correctOption?.toUpperCase() || q.correctAnswer?.toUpperCase());
                    ans.correctText = q.options[corIdx] || '—';
                }
            });
        }

        generateResultPDF(res, populated, req.user);
    } catch (error) {
        console.error('PDF Error:', error);
        res.status(500).json({ success: false, message: 'Could not generate PDF' });
    }
};

/** GET /api/student/retry-wrong/:attemptId */
const getWrongQuestions = async (req, res) => {
    try {
        const attempt = await Attempt.findOne({ _id: req.params.attemptId, userId: req.user._id }).populate(
            'answers.questionId',
            'question options correctAnswer subject marks'
        );

        if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

        const wrongQuestions = attempt.answers
            .filter((a) => !a.isCorrect && a.questionId)
            .map((a) => a.questionId);

        res.json({ success: true, questions: wrongQuestions, total: wrongQuestions.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** PATCH /api/student/profile */
const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.findByIdAndUpdate(req.user._id, { name }, { new: true }).select('-password');
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ════════════════════════════════════════════════════════════════════════════
// EXAM SESSION – STUDENT ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════
const ExamSession = require('../models/ExamSession');

/** POST /api/student/join-exam  body: { code, testCode } */
const joinExamByCode = async (req, res) => {
    try {
        const { code, testCode } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'Exam code is required' });

        const session = await ExamSession.findOne({ sessionCode: code.trim().toUpperCase() }).select('-questions');
        if (!session) return res.status(404).json({ success: false, message: 'Invalid exam code' });

        // Verify Test Code if set
        if (session.testCode && session.testCode !== testCode?.trim()) {
            return res.status(403).json({ success: false, message: 'Invalid Test Code. Please enter the 6-digit code provided by your teacher.' });
        }

        if (!session.isActive) return res.status(403).json({ success: false, message: 'This exam is not active yet. Please wait for the admin to open it.' });

        // Check if student is in allowed list (empty list = open to all exam-students)
        if (session.allowedStudents.length > 0) {
            const allowed = session.allowedStudents.some(id => id.toString() === req.user._id.toString());
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not enrolled in this exam.' });
        }

        // Check if already submitted
        const existing = await Attempt.findOne({ userId: req.user._id, sessionCode: session.sessionCode });
        if (existing) {
            return res.status(409).json({ success: false, message: 'You have already submitted this exam.', attemptId: existing._id, showResults: session.showResults });
        }

        res.json({
            success: true,
            session: {
                _id: session._id,
                sessionCode: session.sessionCode,
                title: session.title,
                subject: session.subject,
                duration: session.duration,
                negativeMarking: session.negativeMarking,
                totalQuestions: session.questions?.length || 0,
            },
        });
    } catch (error) {
        console.error('Join exam error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/session-exam/:code/questions */
const getSessionQuestions = async (req, res) => {
    try {
        const { code } = req.params;
        const session = await ExamSession.findOne({ sessionCode: code.toUpperCase() });
        if (!session) return res.status(404).json({ success: false, message: 'Invalid exam code' });
        if (!session.isActive) return res.status(403).json({ success: false, message: 'Exam is not active' });

        // Shuffle questions uniquely per student (seeded)
        const seed = req.user._id.toString() + code;
        const shuffled = seededShuffle(session.questions, seed).map((q, i) => ({
            _id: q._id || i,
            question: q.question,
            options: seededShuffle(q.options, seed + i), // also shuffle options
            subject: q.subject,
            marks: q.marks,
            // Don't send correctAnswer to client
        }));

        res.json({ success: true, questions: shuffled, sessionCode: code.toUpperCase() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/student/session-exam/:code/submit */
const submitSessionExam = async (req, res) => {
    try {
        const { code } = req.params;
        const { answers, timeTaken } = req.body; // answers: [{ questionIndex, selectedOption }]

        const session = await ExamSession.findOne({ sessionCode: code.toUpperCase() });
        if (!session) return res.status(404).json({ success: false, message: 'Invalid exam code' });

        // Prevent double submission
        const existing = await Attempt.findOne({ userId: req.user._id, sessionCode: session.sessionCode });
        if (existing) return res.status(409).json({ success: false, message: 'Already submitted', attemptId: existing._id });

        // Rebuild shuffled order for this student (same seed = same order)
        const seed = req.user._id.toString() + code;
        const shuffled = seededShuffle(session.questions, seed);

        let score = 0;
        let maxScore = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let skippedCount = 0;
        const processedAnswers = [];

        shuffled.forEach((q, i) => {
            const marks = q.marks || 1;
            maxScore += marks;
            const selected = answers?.[i]?.selectedOption || null;

            // Map selected option letter to actual option accounting for shuffled options
            const shuffledOptions = seededShuffle(q.options, seed + i);
            // Find which letter maps to what content; selected is 'A'/'B'/'C'/'D' index in shuffled
            const OPTS = ['A', 'B', 'C', 'D'];
            let selectedContent = null;
            if (selected) {
                const idx = OPTS.indexOf(selected);
                selectedContent = shuffledOptions[idx] || null;
            }

            // Find correct answer content
            const correctIdx = OPTS.indexOf(q.correctAnswer);
            const correctContent = q.options[correctIdx];

            // Is selected content same as correct content?
            const isCorrect = selectedContent !== null && selectedContent === correctContent;
            const isSkipped = !selected;

            if (isSkipped) skippedCount++;
            else if (isCorrect) { correctCount++; score += marks; }
            else { wrongCount++; if (session.negativeMarking) score -= marks * 0.25; }

            processedAnswers.push({
                questionId: q._id || null,
                selectedOption: selected,
                correctOption: q.correctAnswer,
                isCorrect,
                marks,
            });
        });

        const accuracy = maxScore > 0 ? Math.max(0, (score / maxScore) * 100) : 0;
        const passed = accuracy >= (session.passingMarks || 50);

        const attempt = await Attempt.create({
            userId: req.user._id,
            collegeId: req.user.collegeId,
            mode: 'exam',
            subject: session.subject,
            sessionCode: session.sessionCode,
            answers: processedAnswers,
            score: Math.max(0, Math.round(score * 100) / 100),
            maxScore,
            accuracy: parseFloat(accuracy.toFixed(2)),
            percentage: parseFloat(accuracy.toFixed(2)),
            passed,
            totalQuestions: shuffled.length,
            correctCount,
            wrongCount,
            skippedCount,
            timeTaken: parseInt(timeTaken) || 0,
            negativeMarking: session.negativeMarking,
        });

        res.status(201).json({
            success: true,
            message: 'Exam submitted successfully',
            attemptId: attempt._id,
            showResults: session.showResults,
            summary: { score: attempt.score, maxScore: attempt.maxScore, accuracy: attempt.accuracy, correctCount, wrongCount, skippedCount },
        });
    } catch (error) {
        console.error('Submit session exam error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/my-results */
const getMySessionResults = async (req, res) => {
    try {
        const attempts = await Attempt.find({ userId: req.user._id, sessionCode: { $ne: null } })
            .sort({ createdAt: -1 })
            .select('sessionCode score maxScore accuracy subject createdAt');

        // Group by session to see if results are released
        const sessionCodes = [...new Set(attempts.map(a => a.sessionCode))];
        const sessions = await ExamSession.find({ sessionCode: { $in: sessionCodes } }).select('sessionCode title showResults');
        
        const sessionMap = {};
        sessions.forEach(s => sessionMap[s.sessionCode] = s);

        const results = attempts.map(a => ({
            ...a._doc,
            sessionTitle: sessionMap[a.sessionCode]?.title || 'Unknown Session',
            resultsReleased: sessionMap[a.sessionCode]?.showResults || false
        }));

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/session-exam/:code/result */
const getSessionResult = async (req, res) => {
    try {
        const { code } = req.params;
        const session = await ExamSession.findOne({ sessionCode: code.toUpperCase() });
        if (!session) return res.status(404).json({ success: false, message: 'Invalid exam code' });

        const attempt = await Attempt.findOne({ userId: req.user._id, sessionCode: session.sessionCode });
        if (!attempt) return res.status(404).json({ success: false, message: 'No submission found for this exam' });

        if (!session.showResults) {
            return res.json({
                success: true,
                resultsReleased: false,
                message: 'Results have not been released yet by the admin.',
                summary: { score: attempt.score, maxScore: attempt.maxScore, accuracy: attempt.accuracy },
            });
        }

        // Rebuild shuffled question list with correct answers for review
        const seed = req.user._id.toString() + code;
        const shuffled = seededShuffle(session.questions, seed).map((q, i) => {
            const shuffledOptions = seededShuffle(q.options, seed + i);
            return {
                question: q.question,
                options: shuffledOptions,
                correctAnswer: q.correctAnswer,
                subject: q.subject,
                marks: q.marks,
            };
        });

        res.json({
            success: true,
            resultsReleased: true,
            attempt: {
                score: attempt.score,
                maxScore: attempt.maxScore,
                accuracy: attempt.accuracy,
                correctCount: attempt.correctCount,
                wrongCount: attempt.wrongCount,
                skippedCount: attempt.skippedCount,
                timeTaken: attempt.timeTaken,
                submittedAt: attempt.createdAt,
                answers: attempt.answers,
            },
            questions: shuffled,
            session: { title: session.title, subject: session.subject },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


/** GET /api/student/subjects */
const getStudentSubjects = async (req, res) => {
    try {
        const subjects = await Question.aggregate([
            { $match: { collegeId: req.user.collegeId, isDeleted: false } },
            { $group: { _id: '$subject', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        res.json({ success: true, subjects: subjects.map(s => s._id), subjectCounts: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getPracticeQuestions, submitExam, getAttemptHistory, getAttemptById,
    getDashboardStats, addBookmark, removeBookmark, getBookmarks,
    getLeaderboard, downloadResultPDF, getWrongQuestions, updateProfile,
    getStudentSubjects,
    // Session exam
    joinExamByCode, getSessionQuestions, submitSessionExam, getSessionResult, getMySessionResults,
};

