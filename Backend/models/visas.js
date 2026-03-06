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
    applicantName: { type: String, required: true },
    preferredDate: { type: String, required: true },
    purposeOfTravel: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Approved', 'Rejected'],
        default: 'Pending'
    }
}, { timestamps: true })

module.exports = mongoose.model('visas', VisaApplicationSchema)
