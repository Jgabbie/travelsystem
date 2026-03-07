const ServiceModel = require('../models/service');
const logAction = require('../utils/logger')

const createService = async (req, res) => {
    const { visaName, visaDescription, visaPrice, visaRequirements, visaProcessSteps } = req.body;
    const userId = req.userId;

    console.log("Creating service with data:", { visaName, visaDescription, visaPrice, visaRequirements, visaProcessSteps });
    try {

        const newService = new ServiceModel({
            visaName,
            visaDescription,
            visaPrice,
            visaRequirements,
            visaProcessSteps
        });

        await newService.save();

        logAction('Service created', userId);
        res.status(201).json(newService);
    } catch (error) {
        logAction('Error creating service', userId);
        res.status(500).json({ message: 'Error creating service', error: error.message });
    }
};

const getAllServices = async (req, res) => {
    const userId = req.userId;

    try {
        const services = await ServiceModel.find({});
        logAction('Services retrieved', userId);
        res.status(200).json(services);
    } catch (error) {
        logAction('Error retrieving services', userId);
        res.status(500).json({ message: 'Error retrieving services', error: error.message });
    }
};

const updateService = async (req, res) => {
    const { id } = req.params;
    const { visaName, visaDescription, visaPrice, visaRequirements, visaProcessSteps } = req.body;
    const userId = req.userId;

    try {
        const updatedService = await ServiceModel.findByIdAndUpdate(
            id,
            { visaName, visaDescription, visaPrice, visaRequirements, visaProcessSteps },
            { new: true }
        );
        if (!updatedService) {
            logAction('Service not found for update', userId);
            return res.status(404).json({ message: 'Service not found' });
        }
        logAction('Service updated', userId);
        res.status(200).json(updatedService);
    } catch (error) {
        logAction('Error updating service', userId);
        res.status(500).json({ message: 'Error updating service', error: error.message });
    }
};

const deleteService = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        const deletedService = await ServiceModel.findByIdAndDelete(id);
        if (!deletedService) {
            logAction('Service not found for deletion', userId);
            return res.status(404).json({ message: 'Service not found' });
        }
        logAction('Service deleted', userId);
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        logAction('Error deleting service', userId);
        res.status(500).json({ message: 'Error deleting service', error: error.message });
    }
};

const getService = async (req, res) => {
    const userId = req.userId;
    try {
        const { id } = req.params;
        const service = await ServiceModel.findById(id);
        if (!service) {
            logAction('Service not found', userId);
            return res.status(404).json({ message: "Service not found" });
        }

        res.status(200).json(service);
    } catch (error) {
        logAction('Error retrieving service', userId);
        res.status(500).json({ message: 'Error retrieving service', error: error.message });
    }
}

module.exports = { createService, getAllServices, updateService, deleteService, getService };