const mongoose = require('mongoose');

const tokenCheckoutSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
});

const TokenCheckoutModel = mongoose.model('tokencheckouts', tokenCheckoutSchema);
module.exports = TokenCheckoutModel;