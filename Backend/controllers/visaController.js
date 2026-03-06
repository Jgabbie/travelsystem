const VisaModel = require('../models/visas')
const UserModel = require('../models/user')

const applyVisa = async (req, res) => {
    const { serviceId, preferredDate, purposeOfTravel } = req.body
    const userId = req.userId

    if (!serviceId || !preferredDate || !purposeOfTravel) {
        return res.status(400).json({ message: 'Missing required fields' })
    }

    try {
        const user = await UserModel.findById(userId).select('firstname lastname username')
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        const applicantName = `${user.firstname} ${user.lastname}`.trim() || user.username

        const application = await VisaModel.create({
            userId,
            serviceId,
            applicantName,
            preferredDate,
            purposeOfTravel
        })

        res.status(201).json(application)
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

module.exports = {
    applyVisa,
    getVisaApplications
}
