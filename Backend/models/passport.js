const mongoose = require('mongoose');
const PassportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    applicationNumber: { type: String, unique: true, required: true },
    username: { type: String, required: true },
    dfaLocation: { type: String, required: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    applicationType: { type: String, required: true },
    suggestedAppointmentSchedules: [{
        date: { type: String },
        time: { type: String }
    }],
    suggestedAppointmentScheduleChosen: {
        date: { type: String, default: "" },
        time: { type: String, default: "" }
    },
    submittedDocuments: {
        birthCertificate: { type: String },
        applicationForm: { type: String },
        govId: { type: String },
        additionalDocs: [{ type: String }]
    },
    status: {
        type: String,
        enum: [
            'Application submitted',
            'Application approved',
            'Payment complete',
            'Documents uploaded',
            'Documents approved',
            'Documents received',
            'Documents submitted',
            'Processing by DFA',
            'DFA approved',
            'Passport released',
            'Rejected'
        ],
        default: 'Application submitted'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('passport', PassportSchema);