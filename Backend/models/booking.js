const mongoose = require('mongoose')

const BookingSchema = new mongoose.Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    bookingDate: { type: String, required: true },
    travelDate: { type: String, required: true },
    reference: { type: String, required: true, unique: true },
    status: { type: String, default: 'pending' }
}, { timestamps: true })

module.exports = mongoose.model('bookings', BookingSchema)