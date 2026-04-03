const ExamSession = require('../models/ExamSession');
const StudentExamProgress = require('../models/StudentExamProgress');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const { getStudentTestCode } = require('../utils/testCodeHelper');
const crypto = require('crypto');

// ── Active Exams ──────────────────────────────────────────────────────────────

/** GET /api/student/exams/active — list exams the student is allowed to take */
const getActiveExams = async (req, res) => {
    try {
        const exams = await ExamSession.find({
            collegeId: req.user.collegeId,
            isActive: true,
            isDeleted: false,
            $or: [
                { allowedStudents: { $size: 0 } },        // open to all (no restriction)
                { allowedStudents: req.user._id },         // student is specifically allowed
            ],
        }).select('title subject duration passingMarks negativeMarking sessionCode questions createdAt').lean();

        // Add in-progress info per exam
        const progressMap = {};
        const progressDocs = await StudentExamProgress.find({
            studentId: req.user._id,
            examSessionId: { $in: exams.map((e) => e._id) },
        }).lean();
        progressDocs.forEach((p) => { progressMap[p.examSessionId.toString()] = p; });

        const enriched = exams.map((e) => ({
            ...e,
            progress: progressMap[e._id.toString()] || null,
            canResume: progressMap[e._id.toString()]?.status === 'in-progress',
            alreadySubmitted: ['submitted', 'auto-submitted'].includes(progressMap[e._id.toString()]?.status),
        }));

        res.json({ success: true, exams: enriched });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Start / Resume ────────────────────────────────────────────────────────────

/** POST /api/student/exams/:id/start — create progress doc (idempotent) */
const startExam = async (req, res) => {
    try {
        const { testCode, rejoinToken } = req.body;
        const exam = await ExamSession.findOne({
            _id: req.params.id,
            isActive: true,
            isDeleted: false,
            collegeId: req.user.collegeId,
            $or: [
                { allowedStudents: { $size: 0 } },
                { allowedStudents: req.user._id },
            ],
        });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found or not allowed' });

        // Check if already submitted OR in-progress (Check this BEFORE test code verification to allow seamless resume)
        const existing = await StudentExamProgress.findOne({ studentId: req.user._id, examSessionId: exam._id });
        
        if (existing?.status === 'submitted' || existing?.status === 'auto-submitted') {
            return res.status(409).json({ success: false, message: 'You have already submitted this exam' });
        }

        if (existing?.status === 'blocked') {
            return res.status(403).json({ success: false, message: 'Your exam is blocked due to multiple rejoin attempts. Please contact your teacher.' });
        }

        if (existing && existing.status === 'in-progress') {
            // Recalculate timeLeft based on absolute expiry to prevent cheating (timer keeps running offline)
            const remaining = Math.max(0, Math.floor((new Date(existing.expiresAt) - new Date()) / 1000));
            
            // If it's a resume but no token is provided (and it's not the first session), require a token
            // Wait: The first start doesn't have a token. Any refresh/crash needs a token.
            // On fresh start, existing is null. On resume, existing is present.
            if (existing.rejoinCount > 0) {
                if (!rejoinToken || rejoinToken !== existing.rejoinToken) {
                    return res.status(403).json({ success: false, message: 'Invalid or missing rejoin token. Please request to rejoin from the dashboard.' });
                }
                // Token used! Clear it.
                existing.rejoinToken = null;
            }

            existing.timeLeftSeconds = remaining;
            existing.lastActiveAt = new Date();
            await existing.save();

            // Resume — map to plain objects to avoid Mongoose subdoc serialization issues
            const safeQs = exam.questions.map((q) => ({
                question: q.question,
                options: q.options.map(o => String(o)),
                subject: q.subject || '',
                marks: q.marks || 1,
            }));
            return res.json({
                success: true,
                resumed: true,
                progress: existing,
                exam: { ...exam.toObject(), questions: safeQs },
            });
        }

        // Fresh start verification: Verify Test Code if set (Only for students)
        if (exam.testCode && req.user.role === 'student') {
            const expectedCode = getStudentTestCode(String(req.user._id), String(exam._id), exam.testCode);
            const inputCode = testCode?.trim() || '';

            if (expectedCode !== inputCode) {
                return res.status(403).json({ success: false, message: 'Invalid Test Code. Please enter the UNIQUE 6-digit code provided by your teacher in the Excel sheet.' });
            }
        }

        // Fresh start
        const durationSeconds = exam.duration * 60;
        const expiresAt = new Date(Date.now() + durationSeconds * 1000);

        let progress;
        try {
            progress = await StudentExamProgress.create({
                studentId: req.user._id,
                examSessionId: exam._id,
                collegeId: req.user.collegeId,
                answers: [],
                timeLeftSeconds: durationSeconds,
                expiresAt,
                warningCount: 0,
                rejoinCount: 0,
                status: 'in-progress',
            });
        } catch (err) {
            if (err.code === 11000) {
                // If collision happened (two requests at once), just fetch the existing one
                progress = await StudentExamProgress.findOne({ studentId: req.user._id, examSessionId: exam._id });
            } else {
                throw err;
            }
        }

        // Return exam WITHOUT correct answers — map to plain objects
        const safeQuestions = exam.questions.map((q) => ({
            question: q.question,
            options: q.options.map(o => String(o)),
            subject: q.subject || '',
            marks: q.marks || 1,
        }));
        console.log('[Fresh] Total questions:', safeQuestions.length, '| First q:', JSON.stringify(safeQuestions[0]));

        res.json({ success: true, resumed: false, progress, exam: { ...exam.toObject(), questions: safeQuestions } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** POST /api/student/exams/:id/request-rejoin */
const requestRejoin = async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user._id;

        const progress = await StudentExamProgress.findOne({ examSessionId: id, studentId });
        if (!progress) return res.status(404).json({ success: false, message: 'Progress not found' });

        if (progress.status === 'blocked' || (progress.rejoinCount || 0) >= 2) {
            progress.status = 'blocked';
            await progress.save();
            return res.status(403).json({ success: false, message: 'Exam blocked. Max rejoin attempts reached. Contact teacher.' });
        }

        // Generate a one-time rejoin token
        const token = crypto.randomBytes(32).toString('hex');
        progress.rejoinToken = token;
        progress.rejoinCount = (progress.rejoinCount || 0) + 1;
        progress.lastActiveAt = new Date();
        
        await progress.save();

        res.json({ success: true, token });
    } catch (e) {
        console.error('Request Rejoin Error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/exams/:id/resume — get saved progress */
const resumeExam = async (req, res) => {
    try {
        const exam = await ExamSession.findOne({
            _id: req.params.id,
            isActive: true,
            isDeleted: false,
            collegeId: req.user.collegeId,
            $or: [
                { allowedStudents: { $size: 0 } },
                { allowedStudents: req.user._id },
            ],
        });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

        const progress = await StudentExamProgress.findOne({ studentId: req.user._id, examSessionId: exam._id });
        if (!progress) return res.status(404).json({ success: false, message: 'No progress found. Start the exam first.' });

        if (progress.status !== 'in-progress') {
            return res.status(409).json({ success: false, message: 'Exam already submitted' });
        }

        const safeQuestions = exam.questions.map((q) => ({
            question: q.question,
            options: q.options,
            subject: q.subject,
            marks: q.marks,
        }));

        res.json({ success: true, progress, exam: { ...exam.toObject(), questions: safeQuestions } });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Auto-Save ─────────────────────────────────────────────────────────────────

/** PUT /api/student/exams/:id/save-progress */
const saveProgress = async (req, res) => {
    try {
        const { answers, timeLeftSeconds, warningCount } = req.body;

        const updated = await StudentExamProgress.findOneAndUpdate(
            { studentId: req.user._id, examSessionId: req.params.id, status: 'in-progress' },
            {
                $set: {
                    answers: answers || [],
                    timeLeftSeconds: timeLeftSeconds ?? 0,
                    warningCount: warningCount ?? 0,
                    lastActiveAt: new Date(),
                    lastSavedAt: new Date(),
                },
            },
            { new: true }
        );

        if (!updated) return res.status(404).json({ success: false, message: 'No active exam session found' });
        res.json({ success: true, message: 'Progress saved', lastSavedAt: updated.lastSavedAt });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Submit ────────────────────────────────────────────────────────────────────

/** POST /api/student/exams/:id/submit */
const submitExam = async (req, res) => {
    try {
        let { answers = [], timeTaken, autoSubmitted = false } = req.body;

        const exam = await ExamSession.findOne({ _id: req.params.id, isDeleted: false });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

        // Fetch existing progress
        const existing = await StudentExamProgress.findOne({ studentId: req.user._id, examSessionId: exam._id });

        // Prevent double submit
        if (existing?.status === 'submitted' || existing?.status === 'auto-submitted') {
            const result = await Attempt.findOne({ userId: req.user._id, examSessionId: exam._id });
            return res.json({ success: true, alreadySubmitted: true, resultId: result?._id });
        }

        // LIGHTWEIGHT SUBMIT: If answers are missing in request, use the auto-saved ones from DB
        if (!answers || answers.length === 0) {
            if (existing && existing.answers && existing.answers.length > 0) {
                answers = existing.answers;
                console.log(`[Lightweight Submit] Using ${answers.length} saved answers for exam ${exam._id}`);
            } else {
                console.log('[Lightweight Submit] No answers provided and no saved progress found.');
            }
        }

        // Grade the exam
        let score = 0, maxScore = 0, correct = 0, wrong = 0, skipped = 0;
        const gradedAnswers = exam.questions.map((q, idx) => {
            const ans = answers.find((a) => a.questionIndex === idx);
            const selected = ans?.selectedOption || null;
            const isCorrect = selected === q.correctAnswer;
            const qMarks = q.marks || 1;
            maxScore += qMarks;
            if (!selected) { skipped++; }
            else if (isCorrect) { correct++; score += qMarks; }
            else {
                wrong++;
                if (exam.negativeMarking) score -= 0.25 * qMarks;
            }
            return { selectedOption: selected, correctOption: q.correctAnswer, isCorrect, marks: qMarks };
        });

        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
        const passed = percentage >= exam.passingMarks;

        const attempt = await Attempt.create({
            userId: req.user._id,
            mode: exam.type || 'exam',
            collegeId: req.user.collegeId,
            examSessionId: exam._id,
            sessionCode: exam.sessionCode,
            answers: gradedAnswers,
            score: Math.max(0, score),
            maxScore,
            percentage: Math.max(0, percentage),
            accuracy: correct + wrong > 0 ? (correct / (correct + wrong)) * 100 : 0,
            passed,
            totalQuestions: exam.questions.length,
            correctCount: correct,
            wrongCount: wrong,
            skippedCount: skipped,
            timeTaken: timeTaken || 0,
            negativeMarking: exam.negativeMarking,
            autoSubmitted,
        });

        // Mark progress as submitted
        await StudentExamProgress.findOneAndUpdate(
            { studentId: req.user._id, examSessionId: exam._id },
            { status: autoSubmitted ? 'auto-submitted' : 'submitted', submittedAt: new Date() }
        );

        res.json({
            success: true,
            message: 'Exam submitted successfully',
            resultId: attempt._id,
            result: { score: attempt.score, maxScore, percentage: attempt.percentage, passed, correct, wrong, skipped },
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Results ───────────────────────────────────────────────────────────────────

/** GET /api/student/results */
const getMyResults = async (req, res) => {
    try {
        const results = await Attempt.find({
            userId: req.user._id,
            collegeId: req.user.collegeId,
            isDeleted: false,
        })
        .populate('examSessionId', 'title subject passingMarks showResults showQA')
        .sort('-createdAt')
        .lean();
        res.json({ success: true, results });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** GET /api/student/results/:id */
const getResultById = async (req, res) => {
    try {
        const result = await Attempt.findOne({
            _id: req.params.id,
            userId: req.user._id,
            isDeleted: false,
        }).populate('examSessionId', 'title subject passingMarks showResults showQA questions').lean();

        if (!result) return res.status(404).json({ success: false, message: 'Result not found' });

        // Calculate personal CO stats if questions are available
        const coStatsMap = {};
        const qs = result.examSessionId?.questions || [];
        
        if (qs.length) {
            result.answers.forEach((ans, idx) => {
                const q = qs[idx];
                if (q && q.cos && typeof q.cos === 'string') {
                    const coList = q.cos.split(',').map(s => s.trim()).filter(Boolean);
                    coList.forEach(co => {
                        if (!coStatsMap[co]) coStatsMap[co] = { name: co, correct: 0, total: 0 };
                        coStatsMap[co].total++;
                        if (ans.isCorrect) coStatsMap[co].correct++;
                    });
                }
            });
            
            result.coStats = Object.values(coStatsMap).map(co => ({
                name: co.name,
                accuracy: Math.round((co.correct / co.total) * 100)
            }));
        }

        // If showQA is enabled, attach question snapshots
        if (result.examSessionId?.showResults && result.examSessionId?.showQA && qs.length) {
            result.answersWithQuestions = result.answers.map((ans, idx) => ({
                ...ans,
                question: qs[idx]?.question || '',
                options: (qs[idx]?.options || []).map(o => String(o)),
                subject: qs[idx]?.subject || '',
            }));
        } else if (!result.examSessionId) {
            // Standard/Practice Mode: Always show QA but need to fetch from Question model
            const qIds = result.answers.map(a => a.questionId).filter(Boolean);
            const questions = await Question.find({ _id: { $in: qIds } }).lean();
            const qMap = {};
            questions.forEach(q => qMap[q._id.toString()] = q);

            result.answersWithQuestions = result.answers.map(ans => {
                const q = qMap[ans.questionId?.toString()];
                return {
                    ...ans,
                    question: q?.question || 'Question deleted',
                    options: (q?.options || []).map(o => String(o)),
                    subject: q?.subject || '',
                };
            });
        }
        
        // Don't expose questions array to student unnecessarily
        if (result.examSessionId) delete result.examSessionId.questions;

        res.json({ success: true, result });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getActiveExams, startExam, requestRejoin, resumeExam, saveProgress, submitExam,
    getMyResults, getResultById,
};
