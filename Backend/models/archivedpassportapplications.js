const mongoose = require('mongoose');

const ArchivedPassportApplicationSchema = new mongoose.Schema({
    originalPassportApplicationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    applicationNumber: { type: String, required: true },
    username: { type: String, required: true },
    dfaLocation: { type: String, required: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    applicationType: { type: String, required: true },
    suggestedAppointmentSchedules: { type: Array, default: [] },
    suggestedAppointmentScheduleChosen: {
        date: { type: String, default: '' },
        time: { type: String, default: '' }
    },
    submittedDocuments: {
        birthCertificate: { type: String },
        applicationForm: { type: String },
        govId: { type: String },
        additionalDocs: [{ type: String }]
    },
    passportReleaseOption: { type: String, default: '' },
    deliveryAddress: { type: String, default: '' },
    status: { type: String, default: 'Application Submitted' },
    createdAt: { type: Date },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedPassportApplicationModel = mongoose.model('archivedpassportapplications', ArchivedPassportApplicationSchema);

module.exports = ArchivedPassportApplicationModel;
