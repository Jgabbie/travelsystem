const ServiceModel = require('../models/service');
const logAction = require('../utils/logger')

const createService = async (req, res) => {
    const { visaName, visaDescription, visaPrice, visaRequirements, visaAdditionalRequirements, visaProcessSteps, visaReminders } = req.body;
    const userId = req.userId;

    try {

        const newService = new ServiceModel({
            visaName,
            visaDescription,
            visaPrice,
            visaRequirements,
            visaAdditionalRequirements: Array.isArray(visaAdditionalRequirements) ? visaAdditionalRequirements : [],
            visaProcessSteps,
            visaReminders
        });

        await newService.save();

        logAction('SERVICE_CREATED', userId, { "Service Created": `Service Created: ${visaName}` });
        res.status(201).json(newService);
    } catch (error) {
        logAction('CREATE_SERVICE_ERROR', userId, { "Service Creation Failed": `Error: ${error.message}` });
        res.status(500).json({ message: 'Error creating service', error: error.message });
    }
};

const getAllServices = async (req, res) => {
    const userId = req.userId;

    try {
        const services = await ServiceModel.find({});
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving services', error: error.message });
    }
};

const updateService = async (req, res) => {
    const { id } = req.params;
    const { visaName, visaDescription, visaPrice, visaRequirements, visaAdditionalRequirements, visaProcessSteps, visaReminders } = req.body;
    const userId = req.userId;

    try {
        const updatedService = await ServiceModel.findByIdAndUpdate(
            id,
            { visaName, visaDescription, visaPrice, visaRequirements, visaAdditionalRequirements, visaProcessSteps, visaReminders },
            { new: true }
        );
        if (!updatedService) {
            logAction('SERVICE_NOT_FOUND', userId);
            return res.status(404).json({ message: 'Service not found' });
        }
        logAction('SERVICE_UPDATED', userId, { "Service Updated": `Service Updated: ${visaName}` });
        res.status(200).json(updatedService);
    } catch (error) {
        logAction('UPDATE_SERVICE_ERROR', userId, { "Service Update Failed": `Error: ${error.message}` });
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
        logAction('SERVICE_DELETED', userId, { "Service Deleted": `Service Deleted: ${deletedService.visaName}` });
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        logAction('DELETE_SERVICE_ERROR', userId, { "Service Deletion Failed": `Error: ${error.message}` });
        res.status(500).json({ message: 'Error deleting service', error: error.message });
    }
};

const getService = async (req, res) => {
    const userId = req.userId;
    try {
        const { id } = req.params;
        const service = await ServiceModel.findById(id);

        res.status(200).json(service);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving service', error: error.message });
    }
}

module.exports = { createService, getAllServices, updateService, deleteService, getService };