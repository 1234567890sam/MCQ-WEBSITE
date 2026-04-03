const mongoose = require('mongoose');

/**
 * Attempt = completed exam/practice result.
 * Used for: practice mode results AND formal exam session results.
 */
const attemptSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        mode: {
            type: String,
            enum: ['practice', 'exam', 'test'],
            default: 'practice',
        },
        subject: { type: String, default: 'Mixed' },
        // Multi-tenant
        collegeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'College',
            default: null,
        },
        // For formal exam sessions
        examSessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExamSession',
            default: null,
        },
        sessionCode: { type: String, default: null },
        answers: [
            {
                questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
                selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
                correctOption: { type: String, enum: ['A', 'B', 'C', 'D'] },
                isCorrect: { type: Boolean, default: false },
                marks: { type: Number, default: 1 },
            },
        ],
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        passed: { type: Boolean, default: false },
        totalQuestions: { type: Number, default: 0 },
        correctCount: { type: Number, default: 0 },
        wrongCount: { type: Number, default: 0 },
        skippedCount: { type: Number, default: 0 },
        timeTaken: { type: Number, default: 0 }, // seconds
        weakSubjects: [{ type: String }],
        negativeMarking: { type: Boolean, default: false },
        autoSubmitted: { type: Boolean, default: false }, // anti-cheat auto-submit
        // Soft delete
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

attemptSchema.index({ collegeId: 1, examSessionId: 1, isDeleted: 1 });
attemptSchema.index({ userId: 1, mode: 1 });

module.exports = mongoose.model('Attempt', attemptSchema);
