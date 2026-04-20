const mongoose = require('mongoose');

const ArchivedRatingSchema = new mongoose.Schema({
    originalRatingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
    rating: { type: Number, required: true },
    review: { type: String, default: '' },
    guestName: { type: String, default: '' },
    guestEmail: { type: String, default: '' },
    createdAt: { type: Date },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedRatingModel = mongoose.model('archivedratings', ArchivedRatingSchema);

module.exports = ArchivedRatingModel;
