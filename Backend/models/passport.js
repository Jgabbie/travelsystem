
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

    // Additional passport application information
    passportDetails: {
        // Personal information
        phoneNumber: { type: String, required: true, trim: true },
        mobileNumber: { type: String, required: true, trim: true },
        emailAddress: { type: String, required: true, trim: true, lowercase: true },
        lastName: { type: String, required: true, trim: true },
        givenName: { type: String, required: true, trim: true },
        middleName: { type: String, default: '', trim: true },
        suffix: { type: String, default: '', trim: true },
        dateOfBirth: { type: String, required: true },
        gender: { type: String, required: true },
        civilStatus: { type: String, required: true },
        citizenship: { type: String, required: true, trim: true },
        birthLegitimacy: { type: String, required: true },
        countryOfBirth: { type: String, required: true, trim: true },
        provinceOfBirth: { type: String, required: true, trim: true },
        cityMunicipalityOfBirth: { type: String, required: true, trim: true },

        // Travelling companion
        companionName: { type: String, default: '', trim: true },
        companionRelationship: { type: String, default: '', trim: true },
        companionContactNumber: { type: String, default: '', trim: true },

        // Father's information
        fatherLastName: { type: String, required: true, trim: true },
        fatherGivenName: { type: String, required: true, trim: true },
        fatherMiddleName: { type: String, default: '', trim: true },
        fatherCitizenship: { type: String, required: true, trim: true },

        // Mother's information
        motherMaidenLastName: { type: String, required: true, trim: true },
        motherGivenName: { type: String, required: true, trim: true },
        motherMiddleName: { type: String, default: '', trim: true },
        motherCitizenship: { type: String, required: true, trim: true },

        // Previous passport information (for renewal)
        oldPassportNumber: { type: String, default: '', trim: true },
        oldPassportDateOfIssue: { type: String, default: '' },
        oldPassportIssuingAuthority: { type: String, default: '', trim: true },

        // Emergency contact
        emergencyContactPerson: { type: String, required: true, trim: true },
        emergencyContactNumber: { type: String, required: true, trim: true },

        // Contact and employment information
        currentAddress: { type: String, required: true, trim: true },
        barangay: { type: String, required: true, trim: true },
        currentCity: { type: String, required: true, trim: true },
        currentProvince: { type: String, required: true, trim: true },
        zipCode: { type: String, required: true, trim: true },
        occupation: { type: String, required: true, trim: true },
        officeNumber: { type: String, default: '', trim: true },
        officeAddress: { type: String, default: '', trim: true }
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
