const mongoose = require('mongoose');

const ArchivedTransactionSchema = new mongoose.Schema({
    originalTransactionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'bookings' },
    applicationId: { type: mongoose.Schema.Types.ObjectId },
    applicationType: { type: String },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    invoiceNumber: { type: String },
    reference: { type: String, required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, required: true },
    proofImage: { type: String },
    proofImageType: { type: String },
    proofFileName: { type: String },
    paymentType: { type: String },
    createdAt: { type: Date },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedTransactionModel = mongoose.model('archivedtransactions', ArchivedTransactionSchema);

module.exports = ArchivedTransactionModel;
