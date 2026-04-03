
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

        const application = await PassportModel.create({
            userId,
            username: username,
            dfaLocation,
            preferredDate,
            preferredTime,
            applicationType,
            applicationId: randomApplicationNumber()
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


const getPassportApplications = async (req, res) => {
    try {
        const userId = req.userId
        const user = await UserModel.findById(userId).select('role')
        const isStaff = user && (user.role === 'Admin' || user.role === 'Employee')
        const query = isStaff ? {} : { userId }

        const applications = await PassportModel.find(query).sort({ createdAt: -1 });
        res.status(200).json(applications);
    } catch (error) {
        console.error("Error fetching passport applications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

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
        res.status(200).json({ message: "Status updated", application: updated });
    } catch (error) {
        console.error("Error updating passport status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



module.exports = { applyPassport, getPassportApplications, getPassportApplicationById, updatePassportStatus, updatePassportApplicationWithDocs };