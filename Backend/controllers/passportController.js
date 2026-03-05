const PassportModel = require("../models/passport");
const UserModel = require("../models/user");
const logAction = require('../utils/logger');


const randomApplicationNumber = () => {
    return 'APP-' + Math.random().toString(36).slice(2, 11).toUpperCase();
}

const applyPassport = async (req, res) => {
    try {
        const { userId } = req
        const { dfaLocation, preferredDate, preferredTime, applicationType } = req.body

        if (!dfaLocation || !preferredDate || !preferredTime || !applicationType) {
            return res.status(400).json({ message: "All fields are required" })
        }

        const username = await UserModel.findById(userId).select('username');

        await PassportModel.create({
            userId,
            username: username.username,
            dfaLocation,
            preferredDate,
            preferredTime,
            applicationType,
            applicationId: randomApplicationNumber()
        })


        logAction('applyPassport', userId, { dfaLocation, preferredDate, preferredTime, applicationType });
        res.status(201).json({ message: "Passport application submitted successfully" });


    } catch (error) {
        console.error("Error applying for passport:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getPassportApplications = async (req, res) => {
    try {
        const { userId } = req
        const applications = await PassportModel.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(applications);
    } catch (error) {
        console.error("Error fetching passport applications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { applyPassport, getPassportApplications };