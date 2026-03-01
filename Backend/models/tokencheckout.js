const mongoose = require('mongoose');

const tokenCheckoutSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalPrice: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

// expire after 15 minutes automatically
tokenCheckoutSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });
const TokenCheckoutModel = mongoose.model('tokencheckouts', tokenCheckoutSchema);

module.exports = TokenCheckoutModel;