const mongoose = require("mongoose");

const FlightPriceSchema = new mongoose.Schema({
    origin: String,        // MNL
    destination: String,   // CEB
    date: String,          // YYYY-MM-DD
    price: Number,
    currency: { type: String, default: "PHP" },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("FlightPrice", FlightPriceSchema);