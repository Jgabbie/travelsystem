const LogModel = require('../models/log');

const getLogs = async (req, res) => {
    try {
        // In a real app, check if req.userId is an ADMIN here!
        
        // Fetch logs and populate the 'performedBy' field to show usernames instead of just IDs
        const logs = await LogModel.find()
            .populate('performedBy', 'username email') // Only get username and email
            .sort({ timestamp: -1 }); // Newest first

        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching logs: " + error.message });
    }
};

module.exports = { getLogs };