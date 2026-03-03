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
        difficulty: {
            type: String,
            enum: ['Easy', 'Medium', 'Hard'],
            default: 'Medium',
        },
        marks: {
            type: Number,
            default: 1,
            min: 0,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Track how many times answered correctly/incorrectly
        timesAttempted: { type: Number, default: 0 },
        timesCorrect: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Text index for search
questionSchema.index({ question: 'text', subject: 'text' });

module.exports = mongoose.model('Question', questionSchema);
