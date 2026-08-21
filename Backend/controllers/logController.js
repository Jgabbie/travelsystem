import LogModel from '../models/log.js';
import AuditModel from '../models/audit.js';
import UserModel from '../models/user.js';


// get logs function
const getLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = '',
            action = ''
        } = req.query;

        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(
            Math.max(parseInt(limit, 10) || 10, 1),
            100
        );

        const trimmedSearch = String(search || '').trim();

        const logFilter = {};

        // Action filter
        if (action) {
            logFilter.action = action;
        }

        // Search performed user first
        if (trimmedSearch) {
            const searchRegex = new RegExp(trimmedSearch, 'i');

            const userFilter = {
                $or: [
                    { username: searchRegex },
                    { email: searchRegex }
                ]
            };

            if (role) {
                userFilter.role = role;
            }

            const matchingUsers = await UserModel
                .find(userFilter)
                .select('_id')
                .lean();

            const matchingUserIds = matchingUsers.map(user => user._id);

            logFilter.$or = [
                { action: searchRegex },
                { 'details': searchRegex }
            ];

            if (matchingUserIds.length > 0) {
                logFilter.$or.push({
                    performedBy: { $in: matchingUserIds }
                });
            }
        } else if (role) {
            const matchingUsers = await UserModel
                .find({ role })
                .select('_id')
                .lean();

            logFilter.performedBy = {
                $in: matchingUsers.map(user => user._id)
            };
        }

        const skip = (parsedPage - 1) * parsedLimit;

        const query = LogModel.find(logFilter)
            .select("action performedBy details timestamp")
            .populate("performedBy", "username email role")
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parsedLimit)
            .lean();

        const [logs, total] = await Promise.all([
            query,
            LogModel.countDocuments(logFilter)
        ]);

        res.status(200).json({
            logs,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                totalPages: Math.ceil(total / parsedLimit)
            }
        });

    } catch (error) {
        console.error("Error fetching logs:", error);

        res.status(500).json({
            message: "Error fetching logs",
            error: error.message
        });
    }
};


// get audits function
const getAudits = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = '',
            action = ''
        } = req.query;

        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(
            Math.max(parseInt(limit, 10) || 10, 1),
            100
        );

        const trimmedSearch = String(search || '').trim();

        const auditFilter = {};

        // Action filter
        if (action) {
            auditFilter.action = action;
        }

        // Search performed user first
        if (trimmedSearch) {
            const searchRegex = new RegExp(trimmedSearch, 'i');

            const userFilter = {
                $or: [
                    { username: searchRegex },
                    { email: searchRegex }
                ]
            };

            if (role) {
                userFilter.role = role;
            }

            const matchingUsers = await UserModel
                .find(userFilter)
                .select('_id')
                .lean();

            const matchingUserIds = matchingUsers.map(user => user._id);

            auditFilter.$or = [
                { action: searchRegex },
                { details: searchRegex }
            ];

            if (matchingUserIds.length > 0) {
                auditFilter.$or.push({
                    performedBy: { $in: matchingUserIds }
                });
            }
        } else if (role) {
            const matchingUsers = await UserModel
                .find({ role })
                .select('_id')
                .lean();

            auditFilter.performedBy = {
                $in: matchingUsers.map(user => user._id)
            };
        }

        const skip = (parsedPage - 1) * parsedLimit;

        const query = AuditModel.find(auditFilter)
            .select("action performedBy details timestamp")
            .populate("performedBy", "username email role")
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parsedLimit)
            .lean();

        const [audits, total] = await Promise.all([
            query,
            AuditModel.countDocuments(auditFilter)
        ]);

        res.status(200).json({
            audits,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                totalPages: Math.ceil(total / parsedLimit)
            }
        });

    } catch (error) {
        console.error("Error fetching audits:", error);

        res.status(500).json({
            message: "Error fetching audits",
            error: error.message
        });
    }
};


// get latest 3 audits function
const getLatestAudits = async (req, res) => {
    try {
        const audits = await AuditModel.find()
            .select("action performedBy details timestamp")
            .populate("performedBy", "username email role")
            .sort({ timestamp: -1 })
            .limit(3)
            .lean();

        res.status(200).json(audits);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching latest audits: " + error.message
        });
    }
};


export {
    getLogs,
    getAudits,
    getLatestAudits
};
