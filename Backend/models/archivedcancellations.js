const mongoose = require('mongoose');

const ArchivedCancellationSchema = new mongoose.Schema({
    originalCancellationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'bookings', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    cancellationReason: { type: String, required: true },
    cancellationComments: { type: String, default: '' },
    imageProof: { type: String, required: true },
    cancellationDate: { type: Date },
    reference: { type: String, required: true },
    status: { type: String },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedCancellationModel = mongoose.model('archivedcancellations', ArchivedCancellationSchema);

module.exports = ArchivedCancellationModel;
