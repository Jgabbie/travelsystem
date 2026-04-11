
const PassportModel = require("../models/passport");
const TokenCheckoutPassportModel = require("../models/tokencheckoutpassport");
const UserModel = require("../models/user");
const NotificationModel = require("../models/notification");
const transporter = require("../config/nodemailer");
const logAction = require('../utils/logger');

//GENERATE RANDOM APPLICATION NUMBER -----------------------------------------------------
const randomApplicationNumber = () => {
    return 'APP-PASS-' + Math.floor(100000000 + Math.random() * 900000000);
}


//APPLY FOR PASSPORT ----------------------------------------------------------------------
const applyPassport = async (req, res) => {
    try {
        const userId = req.userId
        const { dfaLocation, preferredDate, preferredTime, applicationType } = req.body

        console.log("User:", userId);

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

        logAction('APPLY_PASSPORT', userId, { dfaLocation, preferredDate, preferredTime, applicationType });

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
    console.log('Received request to update passport application with documents');

    try {
        const userId = req.userId;
        const { id } = req.params;
        const {
            birthCertificate,
            applicationForm,
            govId,
            additionalDocs
        } = req.body;

        console.log("payload:", req.body);

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
        application.status = "Documents uploaded";

        await application.save();

        // Log action
        logAction('UPDATE_PASSPORT', userId, {
            id,
            docsUpdated: !!(birthCertificate || applicationForm || govId || additionalDocs)
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
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #305797;">Passport appointment options</h2>
                        <p>Hello ${user.firstname || user.username},</p>
                        <p>We have suggested appointment options for your passport application.</p>
                        <ul>
                            ${cleanedSlots
                        .map((slot, index) => `<li>Option ${index + 1}: ${slot.date} ${slot.time}</li>`)
                        .join("")}
                        </ul>
                        <p>Please log in to review and confirm your preferred schedule.</p>
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
        application.preferredDate = date;
        application.preferredTime = time;
        await application.save();
        res.status(200).json({ message: "Preferred appointment schedule updated", application });
    } catch (error) {
        console.error("Error updating preferred appointment schedule:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


//UPDATE PASSPORT APPLICATION STATUS ------------------------------------------------------
const updatePassportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = [
            'Application submitted',
            'Application approved',
            'Payment complete',
            'Documents uploaded',
            'Documents approved',
            'Documents received',
            'Documents submitted',
            'Processing by DFA',
            'DFA approved',
            'Passport released',
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
                    link: '/passport',
                    metadata: { applicationId: updated._id, status }
                });

                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: 'Passport application status update',
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2 style="color: #305797;">Passport application status update</h2>
                            <p>Hello ${user.firstname || user.username},</p>
                            <p>Your passport application status is now <strong>${status}</strong>.</p>
                            <p>Please log in to your account to view the latest details.</p>
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

module.exports = { applyPassport, getPassportApplications, getUserPassportApplications, getPassportApplicationById, updatePassportStatus, updatePassportApplicationWithDocs, suggestAppointmentSchedules, chosenSuggestedSchedule, verifyTokenCheckout };