const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true }
}, { timestamps: true })

module.exports = mongoose.model('Wishlist', WishlistSchema)