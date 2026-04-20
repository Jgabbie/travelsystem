const mongoose = require('mongoose');

const ArchivedPackageSchema = new mongoose.Schema({
    originalPackageId: { type: mongoose.Schema.Types.ObjectId, required: true },
    packageName: { type: String, required: true },
    packageCode: { type: String, required: true },
    packagePricePerPax: { type: Number, required: true },
    packageSoloRate: { type: Number, required: true },
    packageChildRate: { type: Number, required: true },
    packageInfantRate: { type: Number, required: true },
    packageDeposit: { type: Number, required: true },
    packageDuration: { type: Number, required: true },
    packageDescription: { type: String, required: true },
    packageType: { type: String, required: true },
    packageSpecificDate: { type: Array, default: [] },
    packageHotels: { type: Array, default: [] },
    packageAirlines: { type: Array, default: [] },
    packageAddons: { type: Object, default: {} },
    packageInclusions: { type: Array, default: [] },
    packageExclusions: { type: Array, default: [] },
    packageTermsConditions: { type: Array, default: [] },
    packageItineraries: { type: Object, default: {} },
    packageTags: { type: Array, default: [] },
    packageDiscountPercent: { type: Number, default: 0 },
    images: { type: Array, default: [] },
    visaRequired: { type: Boolean, default: false },
    createdAt: { type: Date },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedPackageModel = mongoose.model('archivedpackages', ArchivedPackageSchema);

module.exports = ArchivedPackageModel;
