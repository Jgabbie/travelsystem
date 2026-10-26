import mongoose from 'mongoose';

const ArchivedPassportApplicationSchema = new mongoose.Schema({
    originalPassportApplicationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    applicationNumber: { type: String, required: true },
    username: { type: String, required: true },
    dfaLocation: { type: String, required: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    applicationType: { type: String, required: true },
    passportDetails: {
        phoneNumber: { type: String, trim: true },
        mobileNumber: { type: String, trim: true },
        emailAddress: { type: String, trim: true, lowercase: true },
        lastName: { type: String, trim: true },
        givenName: { type: String, trim: true },
        middleName: { type: String, default: '', trim: true },
        suffix: { type: String, default: '', trim: true },
        dateOfBirth: { type: String },
        gender: { type: String },
        civilStatus: { type: String },
        citizenship: { type: String, trim: true },
        birthLegitimacy: { type: String },
        countryOfBirth: { type: String, trim: true },
        provinceOfBirth: { type: String, trim: true },
        cityMunicipalityOfBirth: { type: String, trim: true },
        companionName: { type: String, default: '', trim: true },
        companionRelationship: { type: String, default: '', trim: true },
        companionContactNumber: { type: String, default: '', trim: true },
        fatherLastName: { type: String, trim: true },
        fatherGivenName: { type: String, trim: true },
        fatherMiddleName: { type: String, default: '', trim: true },
        fatherCitizenship: { type: String, trim: true },
        motherMaidenLastName: { type: String, trim: true },
        motherGivenName: { type: String, trim: true },
        motherMiddleName: { type: String, default: '', trim: true },
        motherCitizenship: { type: String, trim: true },
        oldPassportNumber: { type: String, default: '', trim: true },
        oldPassportDateOfIssue: { type: String, default: '' },
        oldPassportIssuingAuthority: { type: String, default: '', trim: true },
        emergencyContactPerson: { type: String, trim: true },
        emergencyContactNumber: { type: String, trim: true },
        currentAddress: { type: String, trim: true },
        barangay: { type: String, trim: true },
        currentCity: { type: String, trim: true },
        currentProvince: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        occupation: { type: String, trim: true },
        officeNumber: { type: String, default: '', trim: true },
        officeAddress: { type: String, default: '', trim: true }
    },
    suggestedAppointmentSchedules: { type: Array, default: [] },
    suggestedAppointmentScheduleChosen: {
        date: { type: String, default: '' },
        time: { type: String, default: '' }
    },
    submittedDocuments: {
        birthCertificate: { type: String },
        applicationForm: { type: String },
        govId: { type: String },
        // additionalDocs: [{ type: String }]
    },
    resubmissionTarget: { type: String, default: null },
    resubmissionTargets: [{ type: String }],
    passportReleaseOption: { type: String, default: '' },
    deliveryAddress: { type: String, default: '' },
    status: { type: String, default: 'Application Submitted' },
    createdAt: { type: Date },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedPassportApplicationModel = mongoose.model('archivedpassportapplications', ArchivedPassportApplicationSchema);

export default ArchivedPassportApplicationModel;
