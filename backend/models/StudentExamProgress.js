const mongoose = require('mongoose');

/**
 * Stores in-progress exam state for auto-save / resume / crash-recovery.
 * One document per student per exam. Upserted on every auto-save.
 */
const studentExamProgressSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        examSessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExamSession',
            required: true,
        },
        collegeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'College',
            required: true,
        },
        // Snapshot of answers indexed by question position
        answers: [
            {
                questionIndex: { type: Number, required: true },
                selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
            },
        ],
        timeLeftSeconds: {
            type: Number,
            default: 0,
        },
        warningCount: {
            type: Number,
            default: 0,
            max: 3,
        },
        rejoinCount: {
            type: Number,
            default: 0,
        },
        rejoinToken: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ['in-progress', 'submitted', 'auto-submitted', 'blocked'],
            default: 'in-progress',
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        lastActiveAt: {
            type: Date,
            default: Date.now,
        },
        lastSavedAt: {
            type: Date,
            default: Date.now,
        },
        submittedAt: {
            type: Date,
            default: null,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

// Compound unique: one progress doc per student per exam
studentExamProgressSchema.index({ studentId: 1, examSessionId: 1 }, { unique: true });

module.exports = mongoose.model('StudentExamProgress', studentExamProgressSchema);
