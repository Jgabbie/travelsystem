
import mongoose from 'mongoose';

const PassportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    applicationNumber: {
        type: String,
        unique: true,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    dfaLocation: {
        type: String,
        required: true
    },
    preferredDate: {
        type: String,
        required: true
    },
    preferredTime: {
        type: String,
        required: true
    },
    applicationType: {
        type: String,
        required: true,
        enum: ['New Passport', 'Renewal Passport']
    },

    // Temporarily optional while the application form is limited to appointment details.
    passportDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: undefined
    },

    suggestedAppointmentSchedules: [{
        date: { type: String },
        time: { type: String }
    }],

    suggestedAppointmentScheduleChosen: {
        date: { type: String, default: '' },
        time: { type: String, default: '' }
    },

    submittedDocuments: {
        birthCertificate: { type: String },
        applicationForm: { type: String },
        govId: { type: String }
    },

    resubmissionTarget: { type: String, default: null },
    resubmissionTargets: [{ type: String }],
    passportReleaseOption: { type: String },
    deliveryAddress: { type: String },

    status: {
        type: String,
        enum: [
            'Application Submitted',
            'Application Approved',
            'Payment Completed',
            'Documents Uploaded',
            'Documents Approved',
            'Documents Received',
            'Documents Submitted',
            'Processing by DFA',
            'DFA Approved',
            'Passport Released'
        ],
        default: 'Application Submitted'
    },

    statusHistory: [{
        status: { type: String },
        changedAt: { type: Date },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        changedByName: { type: String }
    }],

    deadlineWarnings: [{
        status: { type: String },
        deadlineDate: { type: String },
        warnedAt: { type: Date }
    }],

    processSteps: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    onPenalty: { type: Boolean, default: false },
    penaltyDeadline: { type: String, default: '' },
    secondChance: { type: Boolean, default: false },
    secondDeadline: { type: String, default: '' },
    reachedSecondDeadline: { type: Boolean, default: false },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('passport', PassportSchema);
