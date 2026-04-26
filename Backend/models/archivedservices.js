const mongoose = require('mongoose');

const ArchivedServiceSchema = new mongoose.Schema({
    originalServiceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    visaName: { type: String, required: true },
    visaPrice: { type: Number, required: true },
    visaDescription: { type: String, required: true },
    visaRequirements: { type: [Object], required: true },
    visaAdditionalRequirements: { type: [Object], default: [] },
    visaProcessSteps: { type: [mongoose.Schema.Types.Mixed], required: true },
    visaReminders: { type: [String], required: true },
    createdAt: { type: Date },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedServiceModel = mongoose.model('archivedservices', ArchivedServiceSchema);

module.exports = ArchivedServiceModel;
