const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'bookings', required: false }, // make optional
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'passportApplications', required: false },
    applicationType: { type: String, required: false }, // ADD THIS
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    invoiceNumber: { type: String, required: false },
    reference: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, required: true },
    proofImage: { type: String },
    proofImageType: { type: String },
    proofFileName: { type: String },
    paymentType: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('transactions', TransactionSchema);