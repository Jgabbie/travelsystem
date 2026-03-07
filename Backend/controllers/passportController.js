const PassportModel = require("../models/passport");
const UserModel = require("../models/user");
const logAction = require('../utils/logger');


const randomApplicationNumber = () => {
    return 'APP-' + Math.random().toString(36).slice(2, 11).toUpperCase();
}

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

        await PassportModel.create({
            userId,
            username: username,
            dfaLocation,
            preferredDate,
            preferredTime,
            applicationType,
            applicationId: randomApplicationNumber()
        })


        logAction('APPLY_PASSPORT', userId, { dfaLocation, preferredDate, preferredTime, applicationType });
        res.status(201).json({ message: "Passport application submitted successfully" });


    } catch (error) {
        console.error("Error applying for passport:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getPassportApplications = async (req, res) => {
    try {
        const userId = req.userId
        const applications = await PassportModel.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(applications);
    } catch (error) {
        console.error("Error fetching passport applications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { applyPassport, getPassportApplications };