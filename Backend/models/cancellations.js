const mongoose = require('mongoose');

const CancellationSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'bookings', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    cancellationReason: { type: String, required: true },
    cancellationDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Approved', 'Disapproved'], default: 'Pending' }
});

module.exports = mongoose.model('cancellations', CancellationSchema);