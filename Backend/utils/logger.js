const LogModel = require('../models/log');
const AuditModel = require('../models/audit');

const auditExcludedActions = new Set([
    'USER_LOGIN',
    'ADMIN_LOGIN',
    'USER_LOGOUT',
    'ADMIN_LOGOUT',
    'LOGIN_FAILED'
]);

const logAction = async (action, userId, details = {}, ip = '0.0.0.0') => {
    const logPayload = {
        action,
        performedBy: userId,
        details,
        ipAddress: ip
    };

    try {
        await LogModel.create(logPayload);

        if (!auditExcludedActions.has(action)) {
            await AuditModel.create(logPayload);
        }

        console.log(`[LOG] Action: ${action} | User: ${userId}`);
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
};

module.exports = logAction;