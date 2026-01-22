const LogModel = require('../models/log');

const logAction = async (action, userId, details = {}, ip = '0.0.0.0') => {
    try {
        await LogModel.create({
            action,
            performedBy: userId,
            details,
            ipAddress: ip
        });
        console.log(`[LOG] Action: ${action} | User: ${userId}`);
    } catch (error) {
        console.error("Failed to create audit log:", error);

    }
};

module.exports = logAction;