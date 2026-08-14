import UserModel from "../models/user.js";
import BookingModel from "../models/booking.js";
import PackageModel from "../models/package.js";
import TransactionModel from "../models/transactions.js";
import logAction from "../utils/logger.js";
import CancellationModel from "../models/cancellations.js";
import QuotationModel from "../models/quotations.js";
import RatingModel from "../models/rating.js";
import PassportModel from "../models/passport.js";
import VisaModel from "../models/visas.js";
import LogModel from "../models/log.js";
import AuditModel from "../models/audit.js";

//get admins function
const getAdmins = async (req, res) => {
    try {
        const admins = await UserModel.find({ role: "Admin" })
            // Only return fields that the frontend actually needs.
            .select(
                "_id username firstname lastname email role profileImage"
            )
            .lean();

        return res.status(200).json(admins);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


//edit user function
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

        if (role === "Admin" && user.role !== "Admin") {
            const adminCount = await UserModel.countDocuments({
                role: "Admin"
            });

            if (adminCount >= 3) {
                return res.status(400).json({
                    message: "The maximum number of Admin accounts (3) has been reached."
                });
            }
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
            await logAction(
                "ADMIN_UPDATED_USER", req.userId,
                {
                    "Successfully Edited": `Role: ${user.role} | Username: ${user.username} | Email: ${user.email}`,
                }
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


//get dashboard stats function
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


// Get all sidebar notification counts in one request
const getSidebarNotifications = async (req, res) => {
    try {
        const [
            latestBooking,
            latestCancellation,
            latestUser,
            latestTransaction,
            latestQuotation,
            latestRating,
            latestPassport,
            latestVisa,
            latestLog,
            latestAudit
        ] = await Promise.all([
            BookingModel.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
            CancellationModel.findOne().sort({ cancellationDate: -1 }).select("cancellationDate").lean(),
            UserModel.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
            TransactionModel.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
            QuotationModel.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
            RatingModel.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
            PassportModel.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
            VisaModel.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
            LogModel.findOne().sort({ timestamp: -1 }).select("timestamp").lean(),
            AuditModel.findOne().sort({ timestamp: -1 }).select("timestamp").lean()
        ]);

        return res.status(200).json({
            booking: latestBooking?.createdAt || null,
            cancellation: latestCancellation?.cancellationDate || null,
            user: latestUser?.createdAt || null,
            transaction: latestTransaction?.createdAt || null,
            quotation: latestQuotation?.createdAt || null,
            rating: latestRating?.createdAt || null,
            passport: latestPassport?.createdAt || null,
            visa: latestVisa?.createdAt || null,
            log: latestLog?.timestamp || null,
            audit: latestAudit?.timestamp || null
        });
    } catch (err) {
        console.error("Sidebar notification error:", err);
        return res.status(500).json({
            message: "Failed to load sidebar notifications"
        });
    }
};



export {
    getAdmins,
    editUser,
    getDashboardStats,
    getSidebarNotifications
};


