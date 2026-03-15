const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema(
    {
        sessionCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        title: {
            type: String,
            required: [true, 'Exam title is required'],
            trim: true,
        },
        subject: {
            type: String,
            required: [true, 'Subject is required'],
            trim: true,
        },
        // Questions are stored as a snapshot (not refs) so deleting from question bank doesn't affect past exams
        questions: [
            {
                question: { type: String, required: true },
                options: [String],
                correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
                subject: { type: String },
                difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
                marks: { type: Number, default: 1 },
            },
        ],
        duration: {
            type: Number,
            default: 60,
            min: 5,
        }, // minutes
        negativeMarking: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: false, // Admin must explicitly open the exam
        },
        showResults: {
            type: Boolean,
            default: false, // Admin releases results
        },
        allowedStudents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ExamSession', examSessionSchema);
