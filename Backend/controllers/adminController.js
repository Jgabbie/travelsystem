const UserModel = require("../models/user");
const BookingModel = require("../models/booking");
const PackageModel = require("../models/package");
const TransactionModel = require("../models/transactions");
const logAction = require("../utils/logger");

const getAdmins = async (req, res) => {
    try {
        const admins = await UserModel.find({ role: "Admin" });
        res.status(200).json(admins);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const editUser = async (req, res) => {
    const { id } = req.params;
    const { username, name, firstname, lastname, role } = req.body;

    const resolvedFirstName = firstname || (name ? name.trim().split(/\s+/)[0] : "");
    const resolvedLastName = lastname || (name ? name.trim().split(/\s+/).slice(1).join(" ") : "");

    if (!username || !resolvedFirstName || !resolvedLastName || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const existingUser = await UserModel.findOne({
            username,
            _id: { $ne: id }
        });

        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const updatedFields = {};
        const changes = [];

        if (user.username !== username) {
            updatedFields.username = { from: user.username, to: username };
            changes.push("username");
        }
        if (user.firstname !== resolvedFirstName) {
            updatedFields.firstname = { from: user.firstname, to: resolvedFirstName };
            changes.push("firstname");
        }
        if (user.lastname !== resolvedLastName) {
            updatedFields.lastname = { from: user.lastname, to: resolvedLastName };
            changes.push("lastname");
        }
        if (user.role !== role) {
            updatedFields.role = { from: user.role, to: role };
            changes.push("role");
        }

        user.username = username;
        user.firstname = resolvedFirstName;
        user.lastname = resolvedLastName;
        user.role = role;

        await user.save();

        if (changes.length > 0) {
            const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
            await logAction(
                "ADMIN_UPDATED_USER",
                req.userId || null,
                {
                    updatedFields,
                    changedFieldCount: changes.length,
                    targetUserId: user._id,
                    targetUsername: user.username
                },
                ip
            );
        }

        res.status(200).json({
            message: "User updated successfully",
            user: {
                _id: user._id,
                username: user.username,
                firstname: user.firstname,
                lastname: user.lastname,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const requester = await UserModel.findById(req.userId).lean();
        if (!requester || (requester.role !== "Admin" && requester.role !== "Employee")) {
            return res.status(403).json({ message: "Forbidden: Admins and Employees only" });
        }

        const [totalTransactions, totalBookings, totalUsers, totalPackages] = await Promise.all([
            TransactionModel.countDocuments({}),
            BookingModel.countDocuments({}),
            UserModel.countDocuments({}),
            PackageModel.countDocuments({})
        ]);

        res.status(200).json({
            totalTransactions,
            totalBookings,
            totalUsers,
            totalPackages
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAdmins, editUser, getDashboardStats };
