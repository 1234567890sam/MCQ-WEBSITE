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
        testCode: {
            type: String,
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
        description: { type: String, trim: true, default: '' },
        // Multi-tenant
        collegeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'College',
            required: true,
        },
        // Questions stored as snapshot (not refs) so bank deletions don't affect exams
        questions: [
            {
                question: { type: String, required: true },
                options: [String],
                correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
                subject: { type: String },
                cos: { type: String, trim: true },
                marks: { type: Number, default: 1 },
            },
        ],
        duration: { type: Number, default: 60, min: 5 }, // minutes
        passingMarks: { type: Number, default: 50 },     // percentage to pass
        negativeMarking: { type: Boolean, default: false },
        isActive: { type: Boolean, default: false },
        showResults: { type: Boolean, default: false },
        showQA: { type: Boolean, default: false },
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
        createdByRole: {
            type: String,
            enum: ['teacher', 'college-admin', 'saas-admin'],
            default: 'teacher',
        },
        // Soft delete
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

examSessionSchema.index({ collegeId: 1, isDeleted: 1 });

module.exports = mongoose.model('ExamSession', examSessionSchema);
