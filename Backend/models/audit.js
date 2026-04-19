const mongoose = require('mongoose');

const AuditSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true
    },

    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: false,
        default: null
    },

    details: {
        type: Object
    },

    timestamp: {
        type: Date,
        default: Date.now
    }
});

const AuditModel = mongoose.model('auditing', AuditSchema, 'auditing');

module.exports = AuditModel;
