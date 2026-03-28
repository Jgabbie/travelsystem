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
    submittedDocuments: { type: Object },
    status: {
        type: [String],
        default: ['Application Submitted']
    },
    currentStepIndex: { type: Number, default: 0 }
}, { timestamps: true })

module.exports = mongoose.model('visas', VisaApplicationSchema)
