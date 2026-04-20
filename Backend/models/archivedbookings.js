const mongoose = require('mongoose');

const ArchivedBookingSchema = new mongoose.Schema({
    originalBookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    bookingDate: { type: String, required: true },
    travelDate: { type: Object, required: true },
    travelers: { type: Number, required: true },
    reference: { type: String, required: true },
    status: { type: String, default: 'pending' },
    bookingDetails: { type: mongoose.Schema.Types.Mixed },
    passportFiles: [{ type: String }],
    photoFiles: [{ type: String }],
    statusHistory: [
        {
            status: { type: String },
            changedAt: { type: Date, default: Date.now }
        }
    ],
    slotDecremented: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedBookingModel = mongoose.model('archivedbookings', ArchivedBookingSchema);

module.exports = ArchivedBookingModel;
