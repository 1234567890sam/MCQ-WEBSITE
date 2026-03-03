const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const User = require('../models/User');
const { generateResultPDF } = require('../utils/pdfGenerator');

/** GET /api/student/practice */
const getPracticeQuestions = async (req, res) => {
    try {
        const { subject, difficulty, count = 10 } = req.query;
        const filter = {};
        if (subject && subject !== 'All') filter.subject = subject;
        if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;

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

        // Determine weak subjects (< 50% accuracy)
        const weakSubjects = Object.entries(subjectPerformance)
            .filter(([, data]) => data.total > 0 && data.correct / data.total < 0.5)
            .map(([subj]) => subj);

        const attempt = await Attempt.create({
            userId: req.user._id,
            mode,
            subject: req.body.subject || 'Mixed',
            answers: processedAnswers,
            score: Math.max(0, Math.round(score * 100) / 100),
            maxScore,
            accuracy: parseFloat(accuracy.toFixed(2)),
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
            'question options correctAnswer subject difficulty marks'
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
        ).populate('bookmarks', 'question subject difficulty');

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
        ).populate('bookmarks', 'question subject difficulty');

        res.json({ success: true, bookmarks: user.bookmarks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/bookmarks */
const getBookmarks = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('bookmarks', 'question options correctAnswer subject difficulty marks');
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
            { $match: { createdAt: { $gte: startDate } } },
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
        const attempt = await Attempt.findOne({ _id: req.params.attemptId, userId: req.user._id }).populate(
            'answers.questionId',
            'question options correctAnswer subject'
        );

        if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

        generateResultPDF(res, attempt, req.user);
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
            'question options correctAnswer subject difficulty marks'
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

module.exports = {
    getPracticeQuestions, submitExam, getAttemptHistory, getAttemptById,
    getDashboardStats, addBookmark, removeBookmark, getBookmarks,
    getLeaderboard, downloadResultPDF, getWrongQuestions, updateProfile,
};
