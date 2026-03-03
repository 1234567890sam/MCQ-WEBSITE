const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        mode: {
            type: String,
            enum: ['practice', 'exam'],
            default: 'practice',
        },
        subject: {
            type: String,
            default: 'Mixed',
        },
        answers: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Question',
                },
                selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
                correctOption: { type: String, enum: ['A', 'B', 'C', 'D'] },
                isCorrect: { type: Boolean, default: false },
                marks: { type: Number, default: 1 },
            },
        ],
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 }, // percentage
        totalQuestions: { type: Number, default: 0 },
        correctCount: { type: Number, default: 0 },
        wrongCount: { type: Number, default: 0 },
        skippedCount: { type: Number, default: 0 },
        timeTaken: { type: Number, default: 0 }, // in seconds
        weakSubjects: [{ type: String }],
        negativeMarking: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Attempt', attemptSchema);
