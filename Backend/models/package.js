const mongoose = require('mongoose');
const PackageSchema = new mongoose.Schema({
    packageName: { type: String },
    packageCode: { type: String },
    packagePricePerPax: { type: Number },
    packageAvailableSlots: { type: Number },
    packageDuration: { type: Number },
    packageDescription: { type: String },
    packageType: { type: String },
    packageSpecificDate: { type: Array, default: [] },
    packageHotels: { type: Array, default: [] },
    packageAirlines: { type: Array, default: [] },
    packageAddons: { type: Object, default: {} },
    packageInclusions: { type: Array, default: [] },
    packageExclusions: { type: Array, default: [] },
    packageItineraries: { type: Object, default: {} }
});

const PackageModel = mongoose.model("packages", PackageSchema);

module.exports = PackageModel;