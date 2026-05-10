
const PassportModel = require("../models/passport");
const ArchivedPassportApplicationModel = require("../models/archivedpassportapplications");
const TokenCheckoutPassportModel = require("../models/tokencheckoutpassport");
const UserModel = require("../models/user");
const NotificationModel = require("../models/notification");
const transporter = require("../config/nodemailer");
const logAction = require('../utils/logger');
const dayjs = require('dayjs');

const PASSPORT_STATUS_DEADLINE_DAYS_MAP = {
    // Days before the appointment (preferredDate) when each status must be completed
    // e.g. deadlineDate = preferredDate.subtract(deadlineDays, 'day')
    'Application Submitted': 2,
    'Application Approved': 2,
    'Payment Completed': 3,
    'Documents Uploaded': 5,
    'Documents Approved': 2,
    // documents received/submitted should be done in 2 days (relative to appointment)
    'Documents Received': 2,
    'Documents Submitted': 0,
    // processing by DFA happens on the appointment date itself
    'Processing by DFA': 0,
    'DFA Approved': 0,
    'Passport Released': 0,
};

const PASSPORT_TERMINAL_STATUSES = new Set(['DFA Approved', 'Passport Released', 'Rejected']);

const normalizePassportDate = (value) => {
    if (!value) return null;

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.startOf('day') : null;
};

// Return the day the given status was set on the application (startOf day).
// Falls back to updatedAt or createdAt when no explicit history entry exists.
const getStatusSetDateFromApplication = (application, status) => {
    if (!application) return null;
    const history = Array.isArray(application.statusHistory) ? application.statusHistory : [];
    for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i];
        if (!entry) continue;
        if (String(entry.status || '').trim() === String(status || '').trim() && entry.changedAt) {
            return dayjs(entry.changedAt).startOf('day');
        }
    }
    if (application.updatedAt) return dayjs(application.updatedAt).startOf('day');
    if (application.createdAt) return dayjs(application.createdAt).startOf('day');
    return null;
};

const getPassportDeadlineInfo = (application, referenceDate = dayjs()) => {
    if (!application) return null;

    const status = String(application.status || '').trim();
    if (!status || PASSPORT_TERMINAL_STATUSES.has(status)) return null;

    // Special-case: if the status is 'Documents Submitted' and the applicant (user)
    // is the one who completed that status, do not create a deadline or warning.
    // This interprets "user complete the status" by checking the most recent
    // statusHistory entry for 'Documents Submitted' and comparing changedBy
    // to the application.userId.
    if (status === 'Documents Submitted') {
        try {
            const userIdStr = application.userId && typeof application.userId === 'object'
                ? String(application.userId._id || application.userId)
                : String(application.userId);
            const history = Array.isArray(application.statusHistory) ? application.statusHistory : [];
            for (let i = history.length - 1; i >= 0; i--) {
                const entry = history[i];
                if (!entry) continue;
                if (String(entry.status) === 'Documents Submitted') {
                    const changedBy = entry.changedBy;
                    const changedByStr = changedBy && typeof changedBy === 'object'
                        ? String(changedBy._id || changedBy)
                        : String(changedBy);
                    if (userIdStr && changedByStr && userIdStr === changedByStr) {
                        return null; // user completed it — no timer
                    }
                    break; // found entry but not completed by user -> continue with normal deadline
                }
            }
        } catch (e) {
            // if any error occurs while inspecting history, fall through to normal logic
        }
    }

    const deadlineDays = PASSPORT_STATUS_DEADLINE_DAYS_MAP[status];
    if (!Number.isFinite(deadlineDays)) return null;

    const preferredDate = normalizePassportDate(application.preferredDate);

    // Determine deadline anchor:
    // - For 'Processing by DFA' (or any mapping explicitly set to 0) we anchor to the appointment (`preferredDate`).
    // - Otherwise the deadline is relative to when the status was set (statusHistory.changedAt),
    //   i.e. deadline = statusSetDate + deadlineDays.
    let deadlineDate = null;
    if ((status === 'Processing by DFA' || deadlineDays === 0) && preferredDate) {
        deadlineDate = preferredDate.startOf('day');
    } else {
        const statusSetDate = getStatusSetDateFromApplication(application, status);
        if (!statusSetDate) return null;
        deadlineDate = statusSetDate.add(deadlineDays, 'day').startOf('day');
    }
    const warningDate = deadlineDate.subtract(1, 'day').startOf('day');
    const currentDate = referenceDate.startOf('day');
    const daysRemaining = deadlineDate.diff(currentDate, 'day');
    const warningKey = `${status}|${deadlineDate.format('YYYY-MM-DD')}`;
    const warningAlreadySent = Array.isArray(application.deadlineWarnings)
        && application.deadlineWarnings.some((warning) => (
            warning
            && warning.status === status
            && warning.deadlineDate === deadlineDate.format('YYYY-MM-DD')
        ));

    return {
        status,
        deadlineDays,
        preferredDate,
        deadlineDate,
        warningDate,
        warningKey,
        daysRemaining,
        warningAlreadySent,
        shouldSendWarning: daysRemaining === 1 && !warningAlreadySent,
        isOverdue: daysRemaining < 0,
    };
};

const decoratePassportApplication = (application) => {
    if (!application) return application;

    const plainApplication = typeof application.toObject === 'function'
        ? application.toObject()
        : { ...application };

    const deadlineInfo = getPassportDeadlineInfo(plainApplication);

    return {
        ...plainApplication,
        statusDeadlineDate: deadlineInfo ? deadlineInfo.deadlineDate.toISOString() : null,
        statusDeadlineDays: deadlineInfo ? deadlineInfo.deadlineDays : null,
        statusDeadlineWarningDate: deadlineInfo ? deadlineInfo.warningDate.toISOString() : null,
        statusDeadlineDaysRemaining: deadlineInfo ? deadlineInfo.daysRemaining : null,
        statusDeadlineWarningSent: deadlineInfo ? deadlineInfo.warningAlreadySent : false,
    };
};

const sendPassportDeadlineWarning = async (application) => {
    const deadlineInfo = getPassportDeadlineInfo(application);
    if (!deadlineInfo || !deadlineInfo.shouldSendWarning) {
        return { sent: false, application };
    }

    const populatedUser = application.userId && typeof application.userId === 'object' ? application.userId : null;
    const userId = populatedUser?._id || application.userId;
    const user = populatedUser && populatedUser.email
        ? populatedUser
        : await UserModel.findById(userId).select('email username firstname lastname');

    if (!user || !user.email) {
        return { sent: false, application };
    }

    const applicationNumber = application.applicationNumber || 'your passport application';
    const displayName = user.firstname || user.username || 'Customer';
    const deadlineLabel = deadlineInfo.deadlineDate.format('MMMM DD, YYYY');
    const statusLabel = deadlineInfo.status;

    await NotificationModel.create({
        userId: user._id,
        title: 'Passport Deadline Reminder',
        message: `One day remains to complete ${statusLabel} for ${applicationNumber}. The deadline is ${deadlineLabel}.`,
        type: 'passport-deadline-reminder',
        link: '/user-applications',
        metadata: {
            applicationId: application._id,
            applicationNumber,
            status: statusLabel,
            deadlineDate: deadlineInfo.deadlineDate.format('YYYY-MM-DD'),
        }
    });

    await transporter.sendMail({
        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
        to: user.email,
        subject: `Passport Deadline Reminder: ${statusLabel} due ${deadlineLabel}`,
        html: `
            <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                    <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                    <h2 style="color:#305797;">Passport Deadline Reminder</h2>
                    <p style="color:#555; font-size:16px;">Hello <b>${displayName}</b>,</p>
                    <p style="color:#555; font-size:15px; line-height:1.6;">One day remains to complete <b>${statusLabel}</b> for your passport application <b>${applicationNumber}</b>.</p>
                    <p style="color:#555; font-size:15px; line-height:1.6;">Deadline: <b>${deadlineLabel}</b></p>
                    <p style="color:#555; font-size:15px; line-height:1.6;">Please log in and finish the required step to stay on track for your appointment date.</p>

                    <a href="https://mrctravelandtours.com/home"
                        style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                        Login to Your Account
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
        `,
    });

    application.deadlineWarnings = application.deadlineWarnings || [];
    application.deadlineWarnings.push({
        status: deadlineInfo.status,
        deadlineDate: deadlineInfo.deadlineDate.format('YYYY-MM-DD'),
        warnedAt: new Date(),
    });

    if (typeof application.save === 'function') {
        await application.save();
    }

    return { sent: true, application };
};





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

        try {
            const built = buildProcessSteps(application);
            application.processSteps = built;
            await application.save();
        } catch (e) {
            // non-fatal — continue returning application but log
            console.error('Failed to build/persist processSteps:', e);
        }





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
        // record status change in history
        try {
            const userWho = await UserModel.findById(userId).select('username firstname lastname');
            application.statusHistory = application.statusHistory || [];
            application.statusHistory.push({
                status: application.status,
                changedAt: new Date(),
                changedBy: userId,
                changedByName: userWho ? (userWho.firstname || userWho.username) : ''
            });
        } catch (e) {
            console.error('Failed to record status history:', e);
        }

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

//GET USER'S PASSPORT APPLICATIONS ------------------------------------------------------
const getUserPassportApplications = async (req, res) => {
    try {
        const userId = req.userId
        const applications = await PassportModel.find({ userId }).sort({ createdAt: -1 });

        await Promise.all(applications.map((application) => sendPassportDeadlineWarning(application).catch((error) => {
            console.error('Failed to process passport deadline warning:', error);
        })));

        res.status(200).json(applications.map(decoratePassportApplication));
    } catch (error) {
        console.error("Error fetching user passport applications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


//GET PASSPORT APPLICATION BY ID ------------------------------------------------------
const getPassportApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await PassportModel.findById(id)
            .populate('statusHistory.changedBy', 'username firstname lastname')
            .populate('userId', 'username firstname lastname');
        if (!application) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        // Optionally, populate documents if you have a documents field
        await sendPassportDeadlineWarning(application).catch((error) => {
            console.error('Failed to process passport deadline warning:', error);
        });

        res.status(200).json(decoratePassportApplication(application));
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
                title: "Passport Appointment Options",
                message: `We suggested appointment options for your passport application. ${summary}`,
                type: "passport",
                link: "/user-applications",
                metadata: { applicationId: application._id }
            });

            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: "Passport Appointment Options Available",
                html: `
                    <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                            
                                            <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                                                
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
                                                style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                                                Login to Your Account
                                                </a>
                                            </div>
                    
                                            <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                                <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                                <p>M&RC Travel and Tours</p>
                                                <p>info1@mrctravels.com</p>
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
        try {
            application.statusHistory = application.statusHistory || [];
            const userWho = await UserModel.findById(req.userId).select('username firstname lastname');
            application.statusHistory.push({
                status: application.status,
                changedAt: new Date(),
                changedBy: req.userId,
                changedByName: userWho ? (userWho.firstname || userWho.username) : ''
            });
        } catch (e) {
            console.error('Failed to record status history for release option:', e);
        }
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
    const { documentKey, documentKeys } = req.body;

    const documentLabels = {
        birthCertificate: 'PSA Birth Certificate',
        applicationForm: 'Application Form',
        govId: 'Government-issued ID',
        additionalDocs: 'Additional Documents'
    };

    try {
        const application = await PassportModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        const requestedKeys = Array.isArray(documentKeys) && documentKeys.length > 0
            ? documentKeys
            : documentKey
                ? [documentKey]
                : [];

        const uniqueKeys = [...new Set(requestedKeys.filter((key) => documentLabels[key]))];

        if (uniqueKeys.length === 0) {
            return res.status(400).json({ message: "Please select a valid document to resubmit." });
        }

        application.resubmissionTarget = uniqueKeys[uniqueKeys.length - 1];
        application.resubmissionTargets = [...new Set([...(application.resubmissionTargets || []), ...uniqueKeys])];
        application.submittedDocuments = application.submittedDocuments || {};

        for (const key of uniqueKeys) {
            if (key === 'additionalDocs') {
                application.submittedDocuments.additionalDocs = [];
            } else {
                application.set(`submittedDocuments.${key}`, null);
            }
        }

        application.markModified('submittedDocuments');
        application.status = "Payment Completed";
        try {
            application.statusHistory = application.statusHistory || [];
            const userWho = await UserModel.findById(req.userId).select('username firstname lastname');
            application.statusHistory.push({
                status: application.status,
                changedAt: new Date(),
                changedBy: req.userId,
                changedByName: userWho ? (userWho.firstname || userWho.username) : ''
            });
        } catch (e) {
            console.error('Failed to record status history for resubmission request:', e);
        }
        await application.save();

        const user = await UserModel.findById(application.userId);
        if (user) {
            const requestedSummary = uniqueKeys.map((key) => documentLabels[key]).join(', ');

            await NotificationModel.create({
                userId: user._id,
                title: "Passport Document Resubmission Requested",
                message: `Please resubmit your ${requestedSummary.toLowerCase()} for your application.`,
                type: "passport",
                link: "/user-applications",
                metadata: { applicationId: application._id }
            });

            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: "Passport Document Resubmission Requested",
                html: `
                    <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                            <h2 style="color:#305797; margin-bottom:10px;">Passport Document Resubmission Requested</h2>
                            <p style="color:#555; font-size:16px;">Hello <b>${user.firstname || user.username}</b>,</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">Our team needs you to resubmit your ${requestedSummary.toLowerCase()} for your application.</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">Please log in to your account to upload the updated documents.</p>
                            <a href="https://mrctravelandtours.com/home"
                                style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                                Login to Your Account
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
            'Payment Completed',
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
        // find and update so we can record who changed the status
        const app = await PassportModel.findById(id);
        if (!app) {
            return res.status(404).json({ message: "Passport application not found" });
        }

        app.status = status;
        try {
            app.statusHistory = app.statusHistory || [];
            const userWho = await UserModel.findById(req.userId).select('username firstname lastname');
            app.statusHistory.push({
                status,
                changedAt: new Date(),
                changedBy: req.userId,
                changedByName: userWho ? (userWho.firstname || userWho.username) : ''
            });
        } catch (e) {
            console.error('Failed to record status history during status update:', e);
        }

        const updated = await app.save();

        await sendPassportDeadlineWarning(updated).catch((error) => {
            console.error('Failed to process passport deadline warning:', error);
        });

        try {
            const user = await UserModel.findById(updated.userId);
            if (user) {
                await NotificationModel.create({
                    userId: user._id,
                    title: 'Passport Application Status Updated',
                    message: `Your passport application status is now ${status}.`,
                    type: 'passport',
                    link: '/user-applications',
                    metadata: { applicationId: updated._id, status }
                });

                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: 'Passport Application Status Update',
                    html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                            <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                                <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                                <h2 style="color:#305797;">M&RC Travel and Tours</h2>
                                <p style="color:#555;">Your Passport Application Status has been updated.</p>

                                <div style="text-align:center; color:#333; margin-top:15px;">
                                    <p style="font-size:16px; margin-bottom:10px;">Hello ${user.firstname || user.username},</p>
                                    <p>Your Passport Application Status is now <strong>${status}</strong>.</p>
                                </div>

                                <p style="margin-top:15px;">
                                    Log in to your account to view your application details.
                                </p>

                                <a href="https://mrctravelandtours.com/home"
                                style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                                Login to Your Account
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
        res.status(200).json({ message: "Status updated", application: decoratePassportApplication(updated) });
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
            resubmissionTarget: application.resubmissionTarget,
            resubmissionTargets: application.resubmissionTargets,
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
            resubmissionTarget: archivedApplication.resubmissionTarget,
            resubmissionTargets: archivedApplication.resubmissionTargets,
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


// Ordered steps used to build the processSteps object stored on the application.
const STEPS_ORDER = [
    'Application Submitted',
    'Application Approved',
    'Payment Completed',
    'Documents Uploaded',
    'Documents Approved',
    'Documents Received',
    'Documents Submitted',
    'Processing by DFA',
    'DFA Approved',
    'Passport Released'
];

// Build a processSteps object keyed by step name with setDate and deadlineDate (YYYY-MM-DD or null).
// Deadline chaining rule: the first step's deadline = setDate + mapped days; subsequent deadlines
// are computed by adding the mapped days to the previous step's computed deadline (if available).
const buildProcessSteps = (application) => {
    const out = {};
    if (!application) return out;

    const preferredDate = normalizePassportDate(application.preferredDate);
    const createdAt = normalizePassportDate(application.createdAt) || dayjs().startOf('day');

    let prevDeadline = null;

    for (const step of STEPS_ORDER) {
        const setDate = getStatusSetDateFromApplication(application, step) || (step === 'Application Submitted' ? createdAt : null);
        const deadlineDays = PASSPORT_STATUS_DEADLINE_DAYS_MAP[step];

        let deadline = null;

        if (Number.isFinite(deadlineDays) && deadlineDays > 0) {
            if (step === 'Application Submitted') {
                if (setDate) deadline = setDate.add(deadlineDays, 'day').startOf('day');
            } else if (prevDeadline) {
                deadline = prevDeadline.add(deadlineDays, 'day').startOf('day');
            } else if (setDate) {
                deadline = setDate.add(deadlineDays, 'day').startOf('day');
            } else if (preferredDate) {
                // fallback: if nothing else, anchor to preferredDate
                deadline = preferredDate.add(-0, 'day').startOf('day').add(deadlineDays, 'day');
            }
        } else {
            // mapping days === 0 or undefined => no deadline stored
            deadline = null;
        }

        if (deadline) prevDeadline = deadline;

        out[step] = {
            setDate: setDate ? setDate.format('YYYY-MM-DD') : null,
            deadlineDate: deadline ? deadline.format('YYYY-MM-DD') : null,
        };
    }

    return out;
};


//GET PASSPORT APPLICATIONS ----------------------------------------------------------------
const getPassportApplications = async (req, res) => {
    try {

        const applications = await PassportModel.find({})
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })

        await Promise.all(applications.map((application) => sendPassportDeadlineWarning(application).catch((error) => {
            console.error('Failed to process passport deadline warning:', error);
        })));

        res.status(200).json(applications.map(decoratePassportApplication));
    } catch (error) {
        console.error("Error fetching passport applications:", error);
        res.status(500).json({ message: "Internal server error" });
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
    restoreArchivedPassportApplication,
    getPassportDeadlineInfo,
    decoratePassportApplication,
    sendPassportDeadlineWarning,
};

//REQUEST DOCUMENT RESUBMISSION ------------------------------------------------------

