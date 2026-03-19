const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'TOGGLE', 'EXPORT', 'LOGIN']
    },
    targetModel: {
        type: String,
        required: true,
        enum: ['College', 'User', 'Question', 'ExamSession', 'Attempt']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    details: {
        type: String,
        required: false
    },
    ipAddress: String,
    metadata: {
        type: Object,
        default: {}
    }
}, { timestamps: true });

// Index for faster searching
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
