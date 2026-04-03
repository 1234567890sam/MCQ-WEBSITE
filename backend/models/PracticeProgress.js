const mongoose = require('mongoose');

/**
 * Stores in-progress practice session state.
 * Practice sessions are dynamic (no pre-defined ExamSession), 
 * so we store the question IDs and current answers.
 */
const practiceProgressSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true, // One practice session at a time per student
        },
        collegeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'College',
            required: true,
        },
        subject: {
            type: String,
            default: 'All',
        },
        // Store the actual question IDs for this practice session
        questionIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Question',
            }
        ],
        // Answers mapped by questionId string for easy lookup
        answers: {
            type: Map,
            of: String, // option letter 'A', 'B', etc.
            default: {},
        },
        timeTaken: {
            type: Number,
            default: 0,
        },
        lastActiveAt: {
            type: Date,
            default: Date.now,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('PracticeProgress', practiceProgressSchema);
