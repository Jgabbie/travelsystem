const mongoose = require('mongoose')


const RatingSchema = new mongoose.Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    rating: { type: Number, required: true },
    review: { type: String },
}, { timestamps: true })

const Rating = mongoose.model('ratings', RatingSchema)

module.exports = Rating
