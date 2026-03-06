const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    visaName: { type: String, required: true },
    visaPrice: { type: Number, required: true },
    visaDescription: { type: String, required: true },
    visaRequirements: { type: [String], required: true },
    visaProcessSteps: { type: [String], required: true },
});

module.exports = mongoose.model('services', serviceSchema);