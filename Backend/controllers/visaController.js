const VisaModel = require('../models/visas')
const TokenCheckoutVisaModel = require('../models/tokencheckoutvisa')
const ServiceModel = require('../models/service')
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')
const transporter = require('../config/nodemailer')
const logAction = require('../utils/logger')


const generateApplicationNumber = () => {
    return `APP-VISA-${Math.floor(100000000 + Math.random() * 900000000)}`
}

const applyVisa = async (req, res) => {
    const { serviceId, preferredDate, preferredTime, purposeOfTravel, status } = req.body
    const userId = req.userId

    console.log("Applying for visa with data:", { serviceId, preferredDate, preferredTime, purposeOfTravel, status });

    if (!serviceId || !preferredDate || !preferredTime || !purposeOfTravel) {
        return res.status(400).json({ message: 'Missing required fields' })
    }

    try {
        const user = await UserModel.findById(userId).select('firstname lastname username')
        const serviceName = await ServiceModel.findById(serviceId).select('visaName')

        if (!serviceName) {
            return res.status(404).json({ message: 'Visa service not found' })
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        const applicantName = `${user.firstname} ${user.lastname}`.trim() || user.username


        const application = await VisaModel.create({
            applicationNumber: generateApplicationNumber(),
            userId,
            serviceId,
            serviceName: serviceName.visaName,
            applicantName,
            preferredDate,
            preferredTime,
            purposeOfTravel,
            status,
        })

        logAction('APPLY_VISA', userId, { serviceId, preferredDate, purposeOfTravel });
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

        logAction('UPDATE_VISA_APPLICATION', userId, { applicationId: id, preferredDate, purposeOfTravel, submittedDocuments });

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
const getVisaApplications = async (_req, res) => {
    try {
        const applications = await VisaModel.find({})
            .populate('userId', 'firstname lastname username')
            .populate('serviceId', 'visaName')
            .sort({ createdAt: -1 })

        res.status(200).json(applications)
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
        const validStatuses = serviceDoc?.visaProcessSteps || [];

        console.log("Updating visa application status with data:", { id, status, serviceId, validStatuses });

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
                    title: 'Visa application status updated',
                    message: `Your visa application status is now ${status}.`,
                    type: 'visa',
                    link: '/visa',
                    metadata: { applicationId: updated._id, status }
                });

                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: 'Visa application status update',
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2 style="color: #305797;">Visa application status update</h2>
                            <p>Hello ${user.firstname || user.username},</p>
                            <p>Your visa application status is now <strong>${status}</strong>.</p>
                            <p>Please log in to your account to view the latest details.</p>
                        </div>
                    `
                });
            }
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

module.exports = { applyVisa, getVisaApplications, getUserVisaApplications, getVisaApplicationById, updateVisaApplicationWithDocs, updateVisaApplicationStatus, verifyTokenCheckout };
