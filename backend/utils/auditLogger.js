const AuditLog = require('../models/AuditLog');

const logAction = async ({ userId, action, targetModel, targetId, details, ipAddress, metadata = {} }) => {
    try {
        await AuditLog.create({
            userId,
            action,
            targetModel,
            targetId,
            details,
            ipAddress,
            metadata
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

module.exports = { logAction };
