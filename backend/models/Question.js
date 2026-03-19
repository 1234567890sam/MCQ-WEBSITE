const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: [true, 'Question text is required'],
            trim: true,
        },
        options: {
            type: [String],
            validate: {
                validator: (arr) => arr.length === 4,
                message: 'Exactly 4 options are required',
            },
        },
        correctAnswer: {
            type: String,
            required: true,
            enum: ['A', 'B', 'C', 'D'],
        },
        subject: {
            type: String,
            required: [true, 'Subject is required'],
            trim: true,
        },
        cos: { type: String, trim: true },
        marks: { type: Number, default: 1, min: 0 },
        // Multi-tenant
        collegeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'College',
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        timesAttempted: { type: Number, default: 0 },
        timesCorrect: { type: Number, default: 0 },
        // Soft delete
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

questionSchema.index({ question: 'text', subject: 'text' });
questionSchema.index({ collegeId: 1, isDeleted: 1 });

module.exports = mongoose.model('Question', questionSchema);
