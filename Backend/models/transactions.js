const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'bookings', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    packageName: { type: String, required: true },
    reference: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('transactions', TransactionSchema);