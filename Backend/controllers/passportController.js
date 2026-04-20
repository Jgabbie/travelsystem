
const PassportModel = require("../models/passport");
const ArchivedPassportApplicationModel = require("../models/archivedpassportapplications");
const TokenCheckoutPassportModel = require("../models/tokencheckoutpassport");
const UserModel = require("../models/user");
const NotificationModel = require("../models/notification");
const transporter = require("../config/nodemailer");
const logAction = require('../utils/logger');
const dayjs = require('dayjs');

//GENERATE RANDOM APPLICATION NUMBER -----------------------------------------------------
const randomApplicationNumber = () => {
    return 'APP-PASS-' + Math.floor(100000000 + Math.random() * 900000000);
}


//APPLY FOR PASSPORT ----------------------------------------------------------------------
const applyPassport = async (req, res) => {
    try {
        const userId = req.userId
        const { dfaLocation, preferredDate, preferredTime, applicationType } = req.body

        if (!dfaLocation || !preferredDate || !preferredTime || !applicationType) {
            return res.status(400).json({ message: "All fields are required" })
        }

        const user = await UserModel.findById(userId)
        const username = user.username;

        const application = await PassportModel.create({
            userId,
            username: username,
            dfaLocation,
            preferredDate,
            preferredTime,
            applicationType,
            applicationNumber: randomApplicationNumber()
        })

        logAction('APPLY_PASSPORT', userId, { "Passport Application": ` DFA Location: ${dfaLocation} | Preferred Date: ${preferredDate} | Preferred Time: ${preferredTime} | Application Type: ${applicationType}` });

        const io = req.app.get('io')
        if (io) {
            io.emit('passport:created', {
                id: application._id,
                createdAt: application.createdAt
            })
        }
        res.status(201).json({ message: "Passport application submitted successfully" });


    } catch (error) {
        console.error("Error applying for passport:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

//UPDATE PASSPORT APPLICATION WITH DOCUMENTS ------------------------------------------------
const updatePassportApplicationWithDocs = async (req, res) => {

    try {
        const userId = req.userId;
        const { id } = req.params;
        const {
            birthCertificate,
            applicationForm,
            govId,
            additionalDocs
        } = req.body;

        // Find the application
        const application = await PassportModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        // Only owner or staff can update
        if (application.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You are not authorized to update this application" });
        }

        // Update documents (Base64 strings) if provided
        if (birthCertificate) application.submittedDocuments.birthCertificate = birthCertificate;
        if (applicationForm) application.submittedDocuments.applicationForm = applicationForm;
        if (govId) application.submittedDocuments.govId = govId;
        if (additionalDocs && Array.isArray(additionalDocs)) {
            application.submittedDocuments.additionalDocs = additionalDocs; // now array is valid
        }
        application.status = "Documents Uploaded";

        await application.save();

        // Log action
        logAction('UPDATE_PASSPORT', userId, {
            id,
            "Documents Updated": `Application Number: ${application.applicationNumber}`
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('passport:updated', {
                id: application._id,
                updatedAt: application.updatedAt
            });
        }

        res.status(200).json({
            message: "Passport application updated successfully",
            application
        });

    } catch (error) {
        console.error("Error updating passport application with documents:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

//GET PASSPORT APPLICATIONS ----------------------------------------------------------------
const getPassportApplications = async (req, res) => {
    try {

        const applications = await PassportModel.find({})
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })

        res.status(200).json(applications);
    } catch (error) {
        console.error("Error fetching passport applications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


//GET USER'S PASSPORT APPLICATIONS ------------------------------------------------------
const getUserPassportApplications = async (req, res) => {
    try {
        const userId = req.userId
        const applications = await PassportModel.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(applications);
    } catch (error) {
        console.error("Error fetching user passport applications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


//GET PASSPORT APPLICATION BY ID ------------------------------------------------------
const getPassportApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await PassportModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Passport application not found" });
        }
        // Optionally, populate documents if you have a documents field
        res.status(200).json(application);
    } catch (error) {
        console.error("Error fetching passport application by id:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


//SUGGEST APPOINTMENT SCHEDULES ------------------------------------------------------
const suggestAppointmentSchedules = async (req, res) => {
    const { id } = req.params;
    const { slots } = req.body;

    try {
        if (!Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ message: "Suggested appointment slots are required" });
        }

        const cleanedSlots = slots
            .filter((slot) => slot && slot.date && slot.time)
            .map((slot) => ({ date: slot.date, time: slot.time }));

        if (cleanedSlots.length === 0) {
            return res.status(400).json({ message: "All suggested slots must have date and time" });
        }

        const application = await PassportModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        application.suggestedAppointmentSchedules = cleanedSlots;
        application.suggestedAppointmentScheduleChosen = { date: "", time: "" };

        await application.save();

        const user = await UserModel.findById(application.userId);
        if (user) {
            const summary = cleanedSlots
                .map((slot, index) => `Option ${index + 1}: ${slot.date} ${slot.time}`)
                .join(" | ");

            await NotificationModel.create({
                userId: user._id,
                title: "Passport appointment options",
                message: `We suggested appointment options for your passport application. ${summary}`,
                type: "passport",
                link: "/passport",
                metadata: { applicationId: application._id }
            });

            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: "Passport appointment options available",
                html: `
                    <div style="font-family: Arial, sans-serif; background:#ffffff; padding:20px;">
                            
                                            <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:10px; padding:25px; text-align:center;">
                                                
                                                <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />
                    
                                                <h2 style="color:#305797;">Passport Appointment Options</h2>
                                                <p style="color:#555;">We’ve found available schedules for your passport application.</p>
                    
                                                <div style="text-align:center; color:#333; margin-top:15px;">
                                                    <p style="font-size:16px; margin-bottom:10px;">Hello ${user.firstname || user.username},</p>
                                                    <p>Please review the available appointment slots below:</p>
                    
                                                    <ul style="padding-left:20px;">
                                                        ${cleanedSlots
                        .map((slot, index) => `
                                                                    <div style="margin-bottom:10px;">
                                                                        <strong>Option ${index + 1}:</strong> ${dayjs(slot.date).format("MMMM DD, YYYY")} - ${slot.time}
                                                                    </div>
                                                                            `)
                        .join("")}
                                                    </ul>
                    
                                                    <p style="margin-top:15px;">
                                                        Log in to your account to confirm your preferred schedule.
                                                    </p>
                                                </div>
                    
                                                <a href="https://mrctravelandtours.com/home"
                                                style="display:inline-block; margin-top:20px; background:#305797; color:#fff; padding:10px 18px; border-radius:5px; text-decoration:none;">
                                                View Appointment
                                                </a>
                                            </div>
                    
                                            <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                                <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                                <p>M&RC Travel and Tours</p>
                                                <p>support@mrctravelandtours.com</p>
                                                <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                                            </div>
                    
                                    </div>
                `
            });
        }

        res.status(200).json({ message: "Suggested appointment schedules updated", application });
    } catch (error) {
        console.error("Error suggesting appointment schedules:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


//CHOSEN SUGGESTED APPOINTMENT SCHEDULE ------------------------------------------------------
const chosenSuggestedSchedule = async (req, res) => {
    const { id } = req.params;
    const { date, time } = req.body;
    try {
        if (!date || !time) {
            return res.status(400).json({ message: "Chosen appointment date and time are required" });
        }
        const application = await PassportModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        application.suggestedAppointmentSchedules = [];
        application.suggestedAppointmentScheduleChosen = { date, time };
        await application.save();

        res.status(200).json({ message: "Preferred appointment schedule updated", application });
    } catch (error) {
        console.error("Error updating preferred appointment schedule:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

//DELIVERY ADDRESS UPDATE FOR PASSPORT APPLICATION ------------------------------------------------------
const passportReleaseOptionUpdate = async (req, res) => {
    const { id } = req.params;
    const { passportReleaseOption, deliveryAddress } = req.body;

    try {
        if (!passportReleaseOption) {
            return res.status(400).json({ message: "Passport release option is required" });
        }
        const application = await PassportModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        application.passportReleaseOption = passportReleaseOption;
        application.deliveryAddress = deliveryAddress || "";
        application.status = "Passport Released";
        await application.save();

        res.status(200).json({ message: "Passport release option updated", application });
    }
    catch (error) {
        console.error("Error updating passport release option:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const requestPassportDocumentResubmission = async (req, res) => {
    const { id } = req.params;

    try {
        const application = await PassportModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        application.submittedDocuments = {};
        application.status = "Payment Complete";
        await application.save();

        const user = await UserModel.findById(application.userId);
        if (user) {
            await NotificationModel.create({
                userId: user._id,
                title: "Passport documents resubmission requested",
                message: "Please resubmit your passport documents for your application.",
                type: "passport",
                link: "/user-applications",
                metadata: { applicationId: application._id }
            });

            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: "Passport documents resubmission requested",
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #305797;">Passport documents resubmission requested</h2>
                        <p>Hello ${user.firstname || user.username},</p>
                        <p>Our team needs you to resubmit your passport documents for your application.</p>
                        <p>Please log in to your account to upload the updated documents.</p>
                    </div>
                `
            });
        }

        res.status(200).json({ message: "Resubmission requested", application });
    } catch (error) {
        console.error("Error requesting passport document resubmission:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


//UPDATE PASSPORT APPLICATION STATUS ------------------------------------------------------
const updatePassportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = [
            'Application Submitted',
            'Application Approved',
            'Payment Complete',
            'Documents Uploaded',
            'Documents Approved',
            'Documents Received',
            'Documents Submitted',
            'Processing by DFA',
            'DFA Approved',
            'Passport Released',
            'Rejected'
        ];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid or missing status" });
        }
        const updated = await PassportModel.findByIdAndUpdate(id, { status }, { new: true });
        if (!updated) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        try {
            const user = await UserModel.findById(updated.userId);
            if (user) {
                await NotificationModel.create({
                    userId: user._id,
                    title: 'Passport application status updated',
                    message: `Your passport application status is now ${status}.`,
                    type: 'passport',
                    link: '/user-applications',
                    metadata: { applicationId: updated._id, status }
                });

                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: 'Passport application status update',
                    html: `
                        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
                            <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:10px; padding:25px; text-align:center;">
                                <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                                <h2 style="color:#305797;">M&RC Travel and Tours</h2>
                                <p style="color:#555;">Your passport application status has been updated.</p>

                                <div style="text-align:center; color:#333; margin-top:15px;">
                                    <p style="font-size:16px; margin-bottom:10px;">Hello ${user.firstname || user.username},</p>
                                    <p>Your passport application status is now <strong>${status}</strong>.</p>
                                </div>

                                <a href="https://mrctravelandtours.com/home"
                                style="display:inline-block; margin-top:20px; background:#305797; color:#fff; padding:10px 18px; border-radius:5px; text-decoration:none;">
                                View Account
                                </a>

                                <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
                                <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                    <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                    <p>M&RC Travel and Tours</p>
                                    <p>info1@mrctravels.com</p>
                                    <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                        `
                });
            }
        } catch (notifyError) {
            console.error('Failed to send passport status notification:', notifyError);
        }
        res.status(200).json({ message: "Status updated", application: updated });
    } catch (error) {
        console.error("Error updating passport status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


//VERIFY TOKEN CHECKOUT FOR PASSPORT PAYMENT ------------------------------------------------------
const verifyTokenCheckout = async (req, res) => {
    const { token } = req.body;
    try {

        const tokenCheckoutPassport = await TokenCheckoutPassportModel.findOne({ token })

        if (!tokenCheckoutPassport) {
            return res.status(400).json({ message: "Invalid token" });
        }

        if (tokenCheckoutPassport.expiresAt < new Date()) {
            return res.status(400).json({ message: "Token has expired" });
        }

        await TokenCheckoutPassportModel.deleteOne({ _id: tokenCheckoutPassport._id });

        return { valid: true };

    } catch (error) {
        console.error("Error verifying token checkout:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const archivePassportApplication = async (req, res) => {
    const { id } = req.params;
    try {
        const application = await PassportModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        await ArchivedPassportApplicationModel.create({
            originalPassportApplicationId: application._id,
            userId: application.userId,
            applicationNumber: application.applicationNumber,
            username: application.username,
            dfaLocation: application.dfaLocation,
            preferredDate: application.preferredDate,
            preferredTime: application.preferredTime,
            applicationType: application.applicationType,
            suggestedAppointmentSchedules: application.suggestedAppointmentSchedules,
            suggestedAppointmentScheduleChosen: application.suggestedAppointmentScheduleChosen,
            submittedDocuments: application.submittedDocuments,
            passportReleaseOption: application.passportReleaseOption,
            deliveryAddress: application.deliveryAddress,
            status: application.status,
            createdAt: application.createdAt
        });

        await application.deleteOne();

        logAction('PASSPORT_APPLICATION_ARCHIVED', req.userId, { "Passport Application Archived": `Application Number: ${application.applicationNumber}` });

        res.status(200).json({ message: "Passport application archived successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error archiving passport application", error: error.message });
    }
};

const getArchivedPassportApplications = async (_req, res) => {
    try {
        const applications = await ArchivedPassportApplicationModel.find({})
            .populate('userId', 'username email')
            .sort({ archivedAt: -1 });

        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ message: "Error fetching archived passport applications", error: error.message });
    }
};

const restoreArchivedPassportApplication = async (req, res) => {
    const { id } = req.params;
    try {
        const archivedApplication = await ArchivedPassportApplicationModel.findById(id);
        if (!archivedApplication) {
            return res.status(404).json({ message: "Archived passport application not found" });
        }

        const existing = await PassportModel.findOne({ applicationNumber: archivedApplication.applicationNumber });
        if (existing) {
            return res.status(409).json({ message: "Passport application already exists" });
        }

        const restored = await PassportModel.create({
            userId: archivedApplication.userId,
            applicationNumber: archivedApplication.applicationNumber,
            username: archivedApplication.username,
            dfaLocation: archivedApplication.dfaLocation,
            preferredDate: archivedApplication.preferredDate,
            preferredTime: archivedApplication.preferredTime,
            applicationType: archivedApplication.applicationType,
            suggestedAppointmentSchedules: archivedApplication.suggestedAppointmentSchedules,
            suggestedAppointmentScheduleChosen: archivedApplication.suggestedAppointmentScheduleChosen,
            submittedDocuments: archivedApplication.submittedDocuments,
            passportReleaseOption: archivedApplication.passportReleaseOption,
            deliveryAddress: archivedApplication.deliveryAddress,
            status: archivedApplication.status,
            createdAt: archivedApplication.createdAt,
            updatedAt: archivedApplication.createdAt
        });

        await archivedApplication.deleteOne();

        logAction('PASSPORT_APPLICATION_RESTORED', req.userId, { "Passport Application Restored": `Application Number: ${restored.applicationNumber}` });

        res.status(200).json({ message: "Passport application restored successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error restoring passport application", error: error.message });
    }
};

module.exports = {
    applyPassport,
    getPassportApplications,
    getUserPassportApplications,
    getPassportApplicationById,
    updatePassportStatus,
    updatePassportApplicationWithDocs,
    requestPassportDocumentResubmission,
    suggestAppointmentSchedules,
    chosenSuggestedSchedule,
    passportReleaseOptionUpdate,
    verifyTokenCheckout,
    archivePassportApplication,
    getArchivedPassportApplications,
    restoreArchivedPassportApplication
};

//REQUEST DOCUMENT RESUBMISSION ------------------------------------------------------
