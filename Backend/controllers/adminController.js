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
import transporter from "../config/nodemailer.js";
import { buildBrandedEmail } from "../utils/emailTemplate.js";

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
    const { username, name, firstname, lastname, email, role } = req.body;

    const resolvedFirstName = firstname || (name ? name.trim().split(/\s+/)[0] : "");
    const resolvedLastName = lastname || (name ? name.trim().split(/\s+/).slice(1).join(" ") : "");

    if (!username || !resolvedFirstName || !resolvedLastName || !email || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingEmail = await UserModel.findOne({
            email: normalizedEmail,
            _id: { $ne: id }
        });

        const existingUser = await UserModel.findOne({
            username: username.trim(),
            _id: { $ne: id }
        });

        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        if (existingEmail) {
            return res.status(400).json({
                message: "Email already exists"
            });
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

        const oldValues = {
            firstname: user.firstname || "",
            lastname: user.lastname || "",
            username: user.username || "",
            email: user.email || "",
            role: user.role || ""
        };

        const newValues = {
            firstname: resolvedFirstName.trim(),
            lastname: resolvedLastName.trim(),
            username: username.trim(),
            email: normalizedEmail,
            role: role
        };

        const changes = [];

        if (oldValues.firstname !== newValues.firstname) {
            changes.push({
                field: "First Name",
                oldValue: oldValues.firstname || "Not set",
                newValue: newValues.firstname
            });
        }

        if (oldValues.lastname !== newValues.lastname) {
            changes.push({
                field: "Last Name",
                oldValue: oldValues.lastname || "Not set",
                newValue: newValues.lastname
            });
        }

        if (oldValues.username !== newValues.username) {
            changes.push({
                field: "Username",
                oldValue: oldValues.username || "Not set",
                newValue: newValues.username
            });
        }

        if (
            oldValues.email.toLowerCase() !==
            newValues.email.toLowerCase()
        ) {
            changes.push({
                field: "Email",
                oldValue: oldValues.email || "Not set",
                newValue: newValues.email
            });
        }

        if (oldValues.role !== newValues.role) {
            changes.push({
                field: "Role",
                oldValue: oldValues.role || "Not set",
                newValue: newValues.role
            });
        }

        if (changes.length === 0) {
            return res.status(400).json({
                message: "No changes were made"
            });
        }

        user.firstname = newValues.firstname;
        user.lastname = newValues.lastname;
        user.username = newValues.username;
        user.email = newValues.email;
        user.role = newValues.role;

        await user.save();

        if (changes.length > 0) {
            await logAction(
                "ADMIN_UPDATED_USER", req.userId,
                {
                    "Successfully Edited": `Role: ${user.role} | Username: ${user.username} | Email: ${user.email}`,
                }
            );
        }

        const changesHtml = changes
            .map(
                change => `
                    <tr>
                        <td style="
                            padding:12px;
                            border:1px solid #e2e8f0;
                            font-weight:600;
                            color:#334155;
                            background:#f8fafc;
                        ">
                            ${change.field}
                        </td>

                        <td style="
                            padding:12px;
                            border:1px solid #e2e8f0;
                            color:#64748b;
                        ">
                            ${change.oldValue}
                        </td>

                        <td style="
                            padding:12px;
                            border:1px solid #e2e8f0;
                            color:#334155;
                            font-weight:600;
                        ">
                            ${change.newValue}
                        </td>
                    </tr>
                `
            )
            .join("");

        /*
         * Send account update email.
         *
         * We intentionally do NOT allow an email failure
         * to make the user update fail.
         */
        try {
            const mailOptions = {
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,

                to: oldValues.email,

                subject:
                    "M&RC Travel and Tours - Account Information Updated",

                html: buildBrandedEmail({
                    title: "Account Information Updated",

                    introHtml: `
                        Hello <strong>${user.firstname}</strong>,
                    `,

                    bodyHtml: `
                        <p style="margin:0 0 12px;">
                            Your account information has been updated
                            by an administrator.
                        </p>

                        <p style="margin:0 0 18px;">
                            The following changes were made to your account:
                        </p>

                        <div style="
                            overflow-x:auto;
                            margin:0 0 18px;
                        ">
                            <table style="
                                width:100%;
                                border-collapse:collapse;
                                font-size:14px;
                            ">
                                <thead>
                                    <tr>
                                        <th style="
                                            padding:12px;
                                            border:1px solid #e2e8f0;
                                            background:#f8fafc;
                                            text-align:left;
                                            color:#334155;
                                        ">
                                            Field
                                        </th>

                                        <th style="
                                            padding:12px;
                                            border:1px solid #e2e8f0;
                                            background:#f8fafc;
                                            text-align:left;
                                            color:#334155;
                                        ">
                                            Previous
                                        </th>

                                        <th style="
                                            padding:12px;
                                            border:1px solid #e2e8f0;
                                            background:#f8fafc;
                                            text-align:left;
                                            color:#334155;
                                        ">
                                            New
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    ${changesHtml}
                                </tbody>
                            </table>
                        </div>

                        <p style="
                            margin:0 0 12px;
                            font-size:13px;
                            color:#64748b;
                        ">
                            If you did not expect these changes,
                            please contact M&RC Travel and Tours.
                        </p>

                        <p style="
                            margin:0;
                            font-size:13px;
                            color:#64748b;
                        ">
                            This is an automated notification.
                            Please do not reply directly to this email.
                        </p>
                    `
                })
            };

            await transporter.sendMail(mailOptions);

        } catch (emailError) {
            console.error(
                "Failed to send user update email:",
                emailError
            );
        }

        res.status(200).json({
            message: "User updated successfully",
            user: {
                _id: user._id,
                username: user.username,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
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


