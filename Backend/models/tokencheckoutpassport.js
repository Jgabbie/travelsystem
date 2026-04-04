const mongoose = require('mongoose');

const tokenCheckoutPassportSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportApplication', required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
});

const TokenCheckoutPassportModel = mongoose.model('tokencheckoutpassport', tokenCheckoutPassportSchema);
module.exports = TokenCheckoutPassportModel;