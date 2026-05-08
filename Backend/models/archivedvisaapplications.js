const mongoose = require('mongoose');

const ArchivedVisaApplicationSchema = new mongoose.Schema({
    originalVisaApplicationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'services', required: true },
    serviceName: { type: String, required: true },
    applicantName: { type: String, required: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    purposeOfTravel: { type: String, required: true },
    applicationNumber: { type: String, required: true },
    suggestedAppointmentSchedules: { type: Array, default: [] },
    suggestedAppointmentScheduleChosen: {
        date: { type: String, default: '' },
        time: { type: String, default: '' }
    },
    submittedDocuments: { type: Object, default: {} },
    passportReleaseOption: { type: String, default: '' },
    deliveryAddress: { type: String, default: '' },
    deliveryFee: { type: Number, default: 0 },
    deliveryDate: { type: String, default: '' },
    status: { type: Array, default: [] },
    statusHistory: [{
        status: { type: String },
        changedAt: { type: Date },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
        changedByName: { type: String }
    }],
    deadlineWarnings: [{
        status: { type: String },
        deadlineDate: { type: String },
        warnedAt: { type: Date }
    }],
    currentStepIndex: { type: Number, default: 0 },
    createdAt: { type: Date },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedVisaApplicationModel = mongoose.model('archivedvisaapplications', ArchivedVisaApplicationSchema);

module.exports = ArchivedVisaApplicationModel;
