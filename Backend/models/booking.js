const mongoose = require('mongoose')

const BookingSchema = new mongoose.Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    bookingDate: { type: String, required: true },
    travelDate: { type: Object, required: true },
    travelers: { type: Number, required: true },
    reference: { type: String, required: true, unique: true },
    status: { type: String, default: 'pending' },
    bookingDetails: { type: mongoose.Schema.Types.Mixed },
    passportFiles: [{ type: String }], // Array of URLs for passport files
    photoFiles: [{ type: String }], // Array of URLs for photo files
    statusHistory: [
        {
            status: { type: String },
            changedAt: { type: Date, default: Date.now }
        }
    ],
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true })

module.exports = mongoose.model('bookings', BookingSchema)