const VisaModel = require('../models/visas')
const ArchivedVisaApplicationModel = require('../models/archivedvisaapplications')
const TokenCheckoutVisaModel = require('../models/tokencheckoutvisa')
const ServiceModel = require('../models/service')
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')
const transporter = require('../config/nodemailer')
const logAction = require('../utils/logger')
const dayjs = require('dayjs')


const generateApplicationNumber = () => {
    return `APP-VISA-${Math.floor(100000000 + Math.random() * 900000000)}`
}

const applyVisa = async (req, res) => {
    const { serviceName, preferredDate, preferredTime, purposeOfTravel, status } = req.body
    const userId = req.userId

    const serviceId = await ServiceModel.findOne({ visaName: serviceName }).select('_id')

    if (!serviceId || !preferredDate || !preferredTime || !purposeOfTravel) {
        return res.status(400).json({ message: 'Missing required fields' })
    }

    try {
        const user = await UserModel.findById(userId).select('firstname lastname username')

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        const applicantName = `${user.firstname} ${user.lastname}`.trim() || user.username

        const application = await VisaModel.create({
            applicationNumber: generateApplicationNumber(),
            userId,
            serviceId: serviceId,
            serviceName: serviceName,
            applicantName,
            preferredDate,
            preferredTime,
            purposeOfTravel,
            status,
        })

        logAction('APPLY_VISA', userId, { "Visa Application Created": `Application Number: ${application.applicationNumber}` });

        const io = req.app.get('io')
        if (io) {
            io.emit('visa:created', {
                id: application._id,
                createdAt: application.createdAt
            })
        }

        res.status(201).json({ message: 'Visa application submitted successfully' })

    } catch (error) {
        res.status(500).json({ message: 'Error creating visa application', error: error.message })
        console.error('Error creating visa application:', error)
    }
}

const updateVisaApplicationWithDocs = async (req, res) => {
    try {
        const userId = req.userId
        const { id } = req.params;

        const {
            preferredDate,
            preferredTime,
            purposeOfTravel,
            submittedDocuments
        } = req.body;

        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Visa application not found' })
        }

        if (application.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized to update this application' })
        }

        application.preferredDate = preferredDate || application.preferredDate
        application.preferredTime = preferredTime || application.preferredTime
        application.purposeOfTravel = purposeOfTravel || application.purposeOfTravel
        application.submittedDocuments = submittedDocuments || application.submittedDocuments

        await application.save();

        logAction('UPDATE_VISA_APPLICATION', userId, { "Visa Application Updated": `Application Number: ${application.applicationNumber}` });

        const io = req.app.get('io')
        if (io) {
            io.emit('visa:updated', {
                id: application._id,
                updatedAt: application.updatedAt
            })
        }

        res.status(200).json({ message: 'Visa application updated successfully' })

    } catch (error) {
        res.status(500).json({ message: 'Error updating visa application', error: error.message })
    }

}

//REQUEST DOCUMENT RESUBMISSION ------------------------------------------------------
const requestVisaDocumentResubmission = async (req, res) => {
    const { id } = req.params;

    try {
        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
        }

        application.submittedDocuments = {};
        application.status = "Payment complete";
        await application.save();

        const user = await UserModel.findById(application.userId);
        if (user) {
            await NotificationModel.create({
                userId: user._id,
                title: "Visa documents resubmission requested",
                message: "Please resubmit your visa documents for your application.",
                type: "visa",
                link: "/user-applications",
                metadata: { applicationId: application._id }
            });

            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: "Visa Documents Resubmission Requested",
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #305797;">Visa Documents Resubmission Requested</h2>
                        <p>Hello ${user.firstname || user.username},</p>
                        <p>Our team needs you to resubmit your visa documents for your application.</p>
                        <p>Please log in to your account to upload the updated documents.</p>
                    </div>
                `
            });
        }

        res.status(200).json({ message: "Resubmission requested", application });
    } catch (error) {
        console.error("Error requesting visa document resubmission:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
const getVisaApplications = async (_req, res) => {
    try {
        const applications = await VisaModel.find({})
            .populate('userId', 'firstname lastname username')
            .populate('serviceId', 'visaName')
            .sort({ createdAt: -1 })

        const applicationsPayload = applications.map(app => ({
            applicationItem: app._id,
            applicationNumber: app.applicationNumber,
            applicantName: app.applicantName,
            serviceName: app.serviceId?.visaName || app.serviceName || "N/A",
            preferredDate: app.preferredDate,
            preferredTime: app.preferredTime,
            purposeOfTravel: app.purposeOfTravel,
            status: app.status,
            suggestedAppointmentSchedules: app.suggestedAppointmentSchedules,
            suggestedAppointmentScheduleChosen: app.suggestedAppointmentScheduleChosen,
        }))

        res.status(200).json(applicationsPayload)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching visa applications', error: error.message })
    }
}

const getUserVisaApplications = async (req, res) => {
    try {
        const userId = req.userId
        const applications = await VisaModel.find({ userId })
            .populate('serviceId', 'visaName')
            .sort({ createdAt: -1 })
        res.status(200).json(applications)
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching user visa applications', error: error.message })
    }
}

const getVisaApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await VisaModel.findById(id)
            .populate('userId', 'firstname lastname username')
            .populate('serviceId', 'visaName');
        if (!application) {
            return res.status(404).json({ message: 'Visa application not found' });
        }
        res.status(200).json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching visa application', error: error.message });
    }
};

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

        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
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
                title: "Visa Appointment Options",
                message: `We suggested appointment options for your visa application. ${summary}`,
                type: "visa",
                link: "/user-applications",
                metadata: { applicationId: application._id }
            });

            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: "Visa Appointment Options Available",
                html: `
                <div style="font-family: Arial, sans-serif; background:#ffffff; padding:20px;">
        
                        <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:10px; padding:25px; text-align:center;">
                            
                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797;">Visa Appointment Options</h2>
                            <p style="color:#555;">We’ve found available schedules for your visa application.</p>

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
        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
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


//DELIVERY ADDRESS UPDATE FOR VISA APPLICATION ------------------------------------------------------
const passportReleaseOptionUpdate = async (req, res) => {
    const { id } = req.params;
    const { passportReleaseOption, deliveryAddress } = req.body;

    try {
        if (!passportReleaseOption) {
            return res.status(400).json({ message: "Release option is required" });
        }
        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
        }

        application.passportReleaseOption = passportReleaseOption;
        application.deliveryAddress = deliveryAddress || "";
        if ((passportReleaseOption || "").toLowerCase() !== "delivery") {
            application.deliveryFee = 0;
            application.deliveryDate = "";
        }
        application.status = "Passport Released";
        await application.save();

        res.status(200).json({ message: "Release option updated", application });
    }
    catch (error) {
        console.error("Error updating release option:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const updateVisaDeliveryDetails = async (req, res) => {
    const { id } = req.params;
    const { deliveryFee, deliveryDate } = req.body;

    try {
        const fee = Number(deliveryFee);
        if (!Number.isFinite(fee) || fee <= 0) {
            return res.status(400).json({ message: "Valid delivery fee is required" });
        }

        if (!deliveryDate) {
            return res.status(400).json({ message: "Delivery date is required" });
        }

        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
        }

        if ((application.passportReleaseOption || "").toLowerCase() !== "delivery") {
            return res.status(400).json({ message: "Application is not marked for delivery" });
        }

        application.deliveryFee = fee;
        application.deliveryDate = deliveryDate;
        await application.save();

        const user = await UserModel.findById(application.userId);
        if (user) {
            await NotificationModel.create({
                userId: user._id,
                title: "Visa Delivery Details Available",
                message: `Your delivery fee is PHP ${fee.toLocaleString()} and target date is ${deliveryDate}.`,
                type: "visa",
                link: "/user-applications",
                metadata: { applicationId: application._id, deliveryFee: fee, deliveryDate }
            });
        }

        return res.status(200).json({ message: "Visa delivery details updated", application });
    } catch (error) {
        console.error("Error updating visa delivery details:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


const updateVisaApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Get the serviceId from the visa application
        const visaDoc = await VisaModel.findById(id).select('serviceId userId');
        if (!visaDoc || !visaDoc.serviceId) {
            return res.status(404).json({ message: 'Visa application or service not found' });
        }

        const serviceId = visaDoc.serviceId._id || visaDoc.serviceId;

        // Get the valid steps from the service
        const serviceDoc = await ServiceModel.findById(serviceId).select('visaProcessSteps');
        const validStatuses = [...(serviceDoc?.visaProcessSteps), "Rejected"];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const updated = await VisaModel.findByIdAndUpdate(id, { status }, { new: true });
        if (!updated) {
            return res.status(404).json({ message: 'Visa application not found' });
        }

        try {
            const user = await UserModel.findById(updated.userId);
            if (user) {
                await NotificationModel.create({
                    userId: user._id,
                    title: 'Visa Application Status Updated',
                    message: `Your Visa Application Status is now ${status}.`,
                    type: 'visa',
                    link: '/user-applications',
                    metadata: { applicationId: updated._id, status }
                });

                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: 'Visa Application Status Update',
                    html: `
                    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
                            <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:10px; padding:25px; text-align:center;">
                                <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                                <h2 style="color:#305797;">M&RC Travel and Tours</h2>
                                <p style="color:#555;">Your visa application status has been updated.</p>

                                <div style="text-align:center; color:#333; margin-top:15px;">
                                    <p style="font-size:16px; margin-bottom:10px;">Hello ${user.firstname || user.username},</p>
                                    <p>Your Visa Application Status is now <strong>${status}</strong>.</p>
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

            logAction('UPDATE_VISA_STATUS', req.userId, { "Visa Application Status Updated": `Application Number: ${updated.applicationNumber}, New Status: ${status}` });

        } catch (notifyError) {
            console.error('Failed to send visa status notification:', notifyError);
        }

        res.status(200).json({ message: 'Status updated', application: updated });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating visa application status', error: error.message });
    }
};

const verifyTokenCheckout = async (req, res) => {
    const { token } = req.body;
    try {

        const tokenCheckoutVisa = await TokenCheckoutVisaModel.findOne({ token })

        if (!tokenCheckoutVisa) {
            return res.status(400).json({ message: "Invalid token" });
        }

        if (tokenCheckoutVisa.expiresAt < new Date()) {
            return res.status(400).json({ message: "Token has expired" });
        }

        await TokenCheckoutVisaModel.deleteOne({ _id: tokenCheckoutVisa._id });

        return { valid: true };

    } catch (error) {
        console.error("Error verifying token checkout:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const archiveVisaApplication = async (req, res) => {
    const { id } = req.params
    try {
        const application = await VisaModel.findById(id)
        if (!application) {
            return res.status(404).json({ message: 'Visa application not found' })
        }

        await ArchivedVisaApplicationModel.create({
            originalVisaApplicationId: application._id,
            userId: application.userId,
            serviceId: application.serviceId,
            serviceName: application.serviceName,
            applicantName: application.applicantName,
            preferredDate: application.preferredDate,
            preferredTime: application.preferredTime,
            purposeOfTravel: application.purposeOfTravel,
            applicationNumber: application.applicationNumber,
            suggestedAppointmentSchedules: application.suggestedAppointmentSchedules,
            suggestedAppointmentScheduleChosen: application.suggestedAppointmentScheduleChosen,
            submittedDocuments: application.submittedDocuments,
            passportReleaseOption: application.passportReleaseOption,
            deliveryAddress: application.deliveryAddress,
            deliveryFee: application.deliveryFee,
            deliveryDate: application.deliveryDate,
            status: application.status,
            currentStepIndex: application.currentStepIndex,
            createdAt: application.createdAt
        })

        await application.deleteOne()

        logAction('VISA_APPLICATION_ARCHIVED', req.userId, { "Visa Application Archived": `Application Number: ${application.applicationNumber}` })

        res.status(200).json({ message: 'Visa application archived successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Error archiving visa application', error: error.message })
    }
}

const getArchivedVisaApplications = async (_req, res) => {
    try {
        const applications = await ArchivedVisaApplicationModel.find({})
            .populate('userId', 'firstname lastname username')
            .populate('serviceId', 'visaName')
            .sort({ archivedAt: -1 })

        res.status(200).json(applications)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching archived visa applications', error: error.message })
    }
}

const restoreArchivedVisaApplication = async (req, res) => {
    const { id } = req.params
    try {
        const archivedApplication = await ArchivedVisaApplicationModel.findById(id)
        if (!archivedApplication) {
            return res.status(404).json({ message: 'Archived visa application not found' })
        }

        const existing = await VisaModel.findOne({ applicationNumber: archivedApplication.applicationNumber })
        if (existing) {
            return res.status(409).json({ message: 'Visa application already exists' })
        }

        const restored = await VisaModel.create({
            applicationNumber: archivedApplication.applicationNumber,
            userId: archivedApplication.userId,
            serviceId: archivedApplication.serviceId,
            serviceName: archivedApplication.serviceName,
            applicantName: archivedApplication.applicantName,
            preferredDate: archivedApplication.preferredDate,
            preferredTime: archivedApplication.preferredTime,
            purposeOfTravel: archivedApplication.purposeOfTravel,
            suggestedAppointmentSchedules: archivedApplication.suggestedAppointmentSchedules,
            suggestedAppointmentScheduleChosen: archivedApplication.suggestedAppointmentScheduleChosen,
            submittedDocuments: archivedApplication.submittedDocuments,
            passportReleaseOption: archivedApplication.passportReleaseOption,
            deliveryAddress: archivedApplication.deliveryAddress,
            deliveryFee: archivedApplication.deliveryFee,
            deliveryDate: archivedApplication.deliveryDate,
            status: archivedApplication.status,
            currentStepIndex: archivedApplication.currentStepIndex,
            createdAt: archivedApplication.createdAt,
            updatedAt: archivedApplication.createdAt
        })

        await archivedApplication.deleteOne()

        logAction('VISA_APPLICATION_RESTORED', req.userId, { "Visa Application Restored": `Application Number: ${restored.applicationNumber}` })

        res.status(200).json({ message: 'Visa application restored successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Error restoring visa application', error: error.message })
    }
}

module.exports = {
    applyVisa,
    getVisaApplications,
    getUserVisaApplications,
    getVisaApplicationById,
    updateVisaApplicationWithDocs,
    requestVisaDocumentResubmission,
    suggestAppointmentSchedules,
    chosenSuggestedSchedule,
    passportReleaseOptionUpdate,
    updateVisaDeliveryDetails,
    updateVisaApplicationStatus,
    verifyTokenCheckout,
    archiveVisaApplication,
    getArchivedVisaApplications,
    restoreArchivedVisaApplication
};
