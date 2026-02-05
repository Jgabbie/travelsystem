const mongoose = require('mongoose');
const PackageSchema = new mongoose.Schema({
    packageName: { type: String, required: true },
    packageCode: { type: String, required: true, unique: true },
    packagePricePerPax: { type: Number, required: true },
    packageAvailableSlots: { type: Number, required: true },
    packageDuration: { type: Number, required: true },
    packageDescription: { type: String, required: true },
    packageType: { type: String, required: true },
    packageSpecificDate: { type: Array, default: [] },
    packageHotels: { type: Array, default: [], required: true },
    packageAirlines: { type: Array, default: [], required: true },
    packageAddons: { type: Object, default: {}, required: true },
    packageInclusions: { type: Array, default: [], required: true },
    packageExclusions: { type: Array, default: [], required: true },
    packageTermsConditions: { type: Array, default: [], required: true },
    packageItineraries: { type: Object, default: {}, required: true },
    image: { type: String, default: '' },

});

const PackageModel = mongoose.model("packages", PackageSchema);

module.exports = PackageModel;