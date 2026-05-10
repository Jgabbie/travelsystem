const mongoose = require('mongoose')

const VisaApplicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'services',
        required: true
    },
    serviceName: { type: String, required: true },
    applicantName: { type: String, required: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    purposeOfTravel: { type: String, required: true },
    applicationNumber: { type: String, required: true, unique: true },
    suggestedAppointmentSchedules: [{
        date: { type: String },
        time: { type: String }
    }],
    suggestedAppointmentScheduleChosen: {
        date: { type: String, default: "" },
        time: { type: String, default: "" }
    },
    submittedDocuments: { type: Object },
    resubmissionTarget: { type: String, default: null },
    resubmissionTargets: [{ type: String }],
    passportReleaseOption: { type: String },
    deliveryAddress: { type: String },
    deliveryFee: { type: Number, default: 0 },
    deliveryDate: { type: String, default: "" },
    status: {
        type: [String],
        default: ['Application Submitted']
    },
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
    currentStepIndex: { type: Number, default: 0 }
}, { timestamps: true })

module.exports = mongoose.model('visas', VisaApplicationSchema)
