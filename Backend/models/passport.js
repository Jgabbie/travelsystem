const mongoose = require('mongoose');
const PassportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    applicationId: { type: String, unique: true, required: true },
    username: { type: String, required: true },
    dfaLocation: { type: String, required: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    applicationType: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('passport', PassportSchema);