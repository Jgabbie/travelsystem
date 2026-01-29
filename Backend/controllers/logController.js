const LogModel = require('../models/log');

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

module.exports = { getLogs };