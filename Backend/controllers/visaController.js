const VisaModel = require('../models/visas')
const ServiceModel = require('../models/service')
const UserModel = require('../models/user')
const logAction = require('../utils/logger')


const generateApplicationNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase()
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `APP-${timestamp}-${randomPart}`
}

const applyVisa = async (req, res) => {
    const { serviceId, preferredDate, purposeOfTravel } = req.body
    const userId = req.userId

    if (!serviceId || !preferredDate || !purposeOfTravel) {
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
            purposeOfTravel
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

module.exports = { applyVisa, getVisaApplications, getVisaApplicationById };
