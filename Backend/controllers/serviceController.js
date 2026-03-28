const ServiceModel = require('../models/service');
const logAction = require('../utils/logger')

const createService = async (req, res) => {
    const { visaName, visaDescription, visaPrice, visaRequirements, visaProcessSteps, visaReminders } = req.body;
    const userId = req.userId;

    console.log("Creating service with data:", { visaName, visaDescription, visaPrice, visaRequirements, visaProcessSteps, visaReminders });
    try {

        const newService = new ServiceModel({
            visaName,
            visaDescription,
            visaPrice,
            visaRequirements,
            visaProcessSteps,
            visaReminders
        });

        await newService.save();

        logAction('SERVICE_CREATED', userId);
        res.status(201).json(newService);
    } catch (error) {
        logAction('CREATE_SERVICE_ERROR', userId, { error: error.message });
        res.status(500).json({ message: 'Error creating service', error: error.message });
    }
};

const getAllServices = async (req, res) => {
    const userId = req.userId;

    try {
        const services = await ServiceModel.find({});
        logAction('SERVICE_LIST_RETRIEVED', userId);
        res.status(200).json(services);
    } catch (error) {
        logAction('GET_ALL_SERVICES_ERROR', userId, { error: error.message });
        res.status(500).json({ message: 'Error retrieving services', error: error.message });
    }
};

const updateService = async (req, res) => {
    const { id } = req.params;
    const { visaName, visaDescription, visaPrice, visaRequirements, visaProcessSteps, visaReminders } = req.body;
    const userId = req.userId;

    try {
        const updatedService = await ServiceModel.findByIdAndUpdate(
            id,
            { visaName, visaDescription, visaPrice, visaRequirements, visaProcessSteps, visaReminders },
            { new: true }
        );
        if (!updatedService) {
            logAction('SERVICE_NOT_FOUND', userId);
            return res.status(404).json({ message: 'Service not found' });
        }
        logAction('SERVICE_UPDATED', userId);
        res.status(200).json(updatedService);
    } catch (error) {
        logAction('UPDATE_SERVICE_ERROR', userId, { error: error.message });
        res.status(500).json({ message: 'Error updating service', error: error.message });
    }
};

const deleteService = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        const deletedService = await ServiceModel.findByIdAndDelete(id);
        if (!deletedService) {
            logAction('SERVICE_NOT_FOUND', userId);
            return res.status(404).json({ message: 'Service not found' });
        }
        logAction('SERVICE_DELETED', userId);
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        logAction('DELETE_SERVICE_ERROR', userId, { error: error.message });
        res.status(500).json({ message: 'Error deleting service', error: error.message });
    }
};

const getService = async (req, res) => {
    const userId = req.userId;
    try {
        const { id } = req.params;
        const service = await ServiceModel.findById(id);

        if (!service) {
            logAction('SERVICE_NOT_FOUND', userId);
            return res.status(404).json({ message: "Service not found" });
        }

        res.status(200).json(service);
    } catch (error) {
        logAction('GET_SERVICE_ERROR', userId, { error: error.message });
        res.status(500).json({ message: 'Error retrieving service', error: error.message });
    }
}

module.exports = { createService, getAllServices, updateService, deleteService, getService };