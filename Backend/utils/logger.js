const LogModel = require('../models/log');
const AuditModel = require('../models/audit');

const auditExcludedActions = new Set([
    'CUSTOMER_LOGIN',
    'ADMIN_LOGIN',
    'EMPLOYEE_LOGIN',
    'CUSTOMER_LOGOUT',
    'ADMIN_LOGOUT',
    'EMPLOYEE_LOGOUT',
    'LOGIN_FAILED'
]);

const logIncludedActionsOnly = new Set([
    'CUSTOMER_LOGIN',
    'ADMIN_LOGIN',
    'EMPLOYEE_LOGIN',
    'LOGIN_FAILED',
    'CUSTOMER_LOGOUT',
    'ADMIN_LOGOUT',
    'EMPLOYEE_LOGOUT',
]);

const logAction = async (action, userId, details = {}) => {
    const logPayload = {
        action,
        performedBy: userId,
        details,
    };

    try {
        if (logIncludedActionsOnly.has(action)) {
            await LogModel.create(logPayload);
        }

        if (!auditExcludedActions.has(action)) {
            await AuditModel.create(logPayload);
        }

    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
};

module.exports = logAction;