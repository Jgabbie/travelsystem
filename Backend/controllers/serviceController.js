import ServiceModel from '../models/service.js';
import ArchivedServiceModel from '../models/archivedservices.js';
import logAction from '../utils/logger.js';
import mongoose from 'mongoose';

const isPlainObject = value =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);

const isPositiveNumber = value =>
    Number.isFinite(Number(value)) && Number(value) > 0;

const isSafeUrl = value => {
    if (typeof value !== 'string' || value.length > 2048) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

const validateServiceInput = body => {
    const errors = [];
    const payload = isPlainObject(body) ? body : {};

    if (typeof payload.visaName !== 'string' ||
        !payload.visaName.trim() ||
        payload.visaName.trim().length > 150) {
        errors.push('visaName must be 1-150 characters');
    }
    if (typeof payload.visaDescription !== 'string' ||
        !payload.visaDescription.trim() ||
        payload.visaDescription.trim().length > 5000) {
        errors.push('visaDescription must be 1-5000 characters');
    }
    if (!isPositiveNumber(payload.visaPrice)) {
        errors.push('visaPrice must be a positive number');
    }
    if (!isSafeUrl(payload.visaImage)) {
        errors.push('visaImage must be a valid HTTP(S) URL');
    }
    if (!Array.isArray(payload.visaRequirements) || payload.visaRequirements.length > 100) {
        errors.push('visaRequirements must be an array with no more than 100 items');
    } else if (payload.visaRequirements.some(item => !isPlainObject(item))) {
        errors.push('visaRequirements contains invalid entries');
    }
    if (!Array.isArray(payload.visaProcessSteps) || payload.visaProcessSteps.length === 0 || payload.visaProcessSteps.length > 100) {
        errors.push('visaProcessSteps must contain 1-100 items');
    } else if (payload.visaProcessSteps.some(step =>
        !isPlainObject(step) ||
        typeof step.title !== 'string' ||
        !step.title.trim() ||
        typeof step.description !== 'string' ||
        !Number.isFinite(Number(step.daysToBeCompleted)) ||
        Number(step.daysToBeCompleted) < 0
    )) {
        errors.push('visaProcessSteps contains invalid entries');
    }
    if (!Array.isArray(payload.visaReminders) || payload.visaReminders.length > 100 ||
        payload.visaReminders.some(item => typeof item !== 'string' || !item.trim() || item.length > 500)) {
        errors.push('visaReminders must contain up to 100 non-empty strings');
    }

    return errors;
};


//create service function
const createService = async (req, res) => {
    const userId = req.userId;

    try {
        const validationErrors = validateServiceInput(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: 'Invalid visa service data',
                errors: validationErrors
            });
        }

        const {
            visaName,
            visaDescription,
            visaPrice,
            visaImage,
            visaRequirements,
            visaProcessSteps,
            visaReminders
        } = req.body;

        const newService = new ServiceModel({
            visaName: visaName.trim(),
            visaDescription: visaDescription.trim(),
            visaPrice: Number(visaPrice),
            visaImage,
            visaRequirements,
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


//get all services function
const getAllServices = async (req, res) => {
    const userId = req.userId;

    try {
        const services = await ServiceModel.find({});

        const servicesPayload = services.map(service => ({
            visaItem: service._id,
            visaName: service.visaName,
            visaDescription: service.visaDescription,
            visaPrice: service.visaPrice,
            visaImage: service.visaImage,
            visaRequirements: service.visaRequirements,
            visaProcessSteps: service.visaProcessSteps,
            visaReminders: service.visaReminders,
        }));

        res.status(200).json(servicesPayload);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving services', error: error.message });
    }
};


//update service function
const updateService = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid service identifier' });
        }

        const validationErrors = validateServiceInput(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: 'Invalid visa service data',
                errors: validationErrors
            });
        }

        const {
            visaName,
            visaDescription,
            visaPrice,
            visaImage,
            visaRequirements,
            visaProcessSteps,
            visaReminders
        } = req.body;

        const updatedService = await ServiceModel.findByIdAndUpdate(
            id,
            {
                visaName: visaName.trim(),
                visaDescription: visaDescription.trim(),
                visaPrice: Number(visaPrice),
                visaImage,
                visaRequirements,
                visaProcessSteps,
                visaReminders: visaReminders.map(item => item.trim())
            },
            { new: true, runValidators: true }
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


//delete service function
const deleteService = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        const service = await ServiceModel.findById(id);
        if (!service) {
            logAction('SERVICE_NOT_FOUND', userId);
            return res.status(404).json({ message: 'Service not found' });
        }

        await ArchivedServiceModel.create({
            originalServiceItem: id,
            visaName: service.visaName,
            visaPrice: service.visaPrice,
            visaImage: service.visaImage,
            visaDescription: service.visaDescription,
            visaRequirements: service.visaRequirements,
            visaProcessSteps: service.visaProcessSteps,
            visaReminders: service.visaReminders,
            createdAt: service.createdAt
        });

        await service.deleteOne();

        logAction('SERVICE_ARCHIVED', userId, { "Service Archived": `Service Archived: ${service.visaName}` });
        res.status(200).json({ message: 'Service archived successfully' });
    } catch (error) {
        logAction('DELETE_SERVICE_ERROR', userId, { "Service Archive Failed": `Error: ${error.message}` });
        res.status(500).json({ message: 'Error archiving service', error: error.message });
    }
};


//get archived services function
const getArchivedServices = async (_req, res) => {
    try {
        const services = await ArchivedServiceModel.find({}).sort({ archivedAt: -1 });
        const servicesPayload = services.map(service => ({
            visaItem: service._id,
            originalServiceItem: service.originalServiceItem,
            visaName: service.visaName,
            visaPrice: service.visaPrice,
            visaDescription: service.visaDescription,
            visaImage: service.visaImage,
            visaRequirements: service.visaRequirements,
            visaProcessSteps: service.visaProcessSteps,
            visaReminders: service.visaReminders,
            createdAt: service.createdAt,
            archivedAt: service.archivedAt,
        }));

        res.status(200).json(servicesPayload);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving archived services', error: error.message });
    }
};


//restore archived service function
const restoreArchivedService = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;


    try {
        const archivedService = await ArchivedServiceModel.findById(id);
        if (!archivedService) {
            return res.status(404).json({ message: 'Archived service not found' });
        }

        const restoredService = await ServiceModel.create({
            visaName: archivedService.visaName,
            visaPrice: archivedService.visaPrice,
            visaDescription: archivedService.visaDescription,
            visaImage: archivedService.visaImage,
            visaRequirements: archivedService.visaRequirements,
            visaProcessSteps: archivedService.visaProcessSteps,
            visaReminders: archivedService.visaReminders
        });

        await archivedService.deleteOne();

        logAction('SERVICE_RESTORED', userId, { "Service Restored": `Service Restored: ${restoredService.visaName}` });
        res.status(200).json({ message: 'Service restored successfully' });
    } catch (error) {
        logAction('SERVICE_RESTORED', userId, { "Service Restored Error": `Error restoring service: ${error.message}` });
        res.status(500).json({ message: 'Error restoring service', error: error.message });
    }
};


//get single service function
const getService = async (req, res) => {
    const userId = req.userId;
    try {
        const { id } = req.params;
        const service = await ServiceModel.findById(id);

        const servicePayload = {
            visaItem: service._id,
            visaName: service.visaName,
            visaDescription: service.visaDescription,
            visaPrice: service.visaPrice,
            visaImage: service.visaImage,
            visaRequirements: service.visaRequirements,
            visaProcessSteps: service.visaProcessSteps,
            visaReminders: service.visaReminders,
        }

        res.status(200).json(servicePayload);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving service', error: error.message });
    }
}





export {
    createService,
    getAllServices,
    updateService,
    deleteService,
    getService,
    getArchivedServices,
    restoreArchivedService
};
