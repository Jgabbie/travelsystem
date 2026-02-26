const LogModel = require('../models/log');
const AuditModel = require('../models/audit');

const getLogs = async (req, res) => {
    try {
        // Fetch logs and populate 'performedBy' with username, email, AND role
        const logs = await LogModel.find()
            .populate('performedBy', 'username email role') 
            .sort({ timestamp: -1 });

        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching logs: " + error.message });
    }
};

const getAudits = async (req, res) => {
    try {
        const audits = await AuditModel.find()
            .populate('performedBy', 'username email role')
            .sort({ timestamp: -1 });

        res.status(200).json(audits);
    } catch (error) {
        res.status(500).json({ message: "Error fetching audits: " + error.message });
    }
};

module.exports = { getLogs, getAudits };