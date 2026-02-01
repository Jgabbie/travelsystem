const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    action: { 
        type: String, 
        required: true 
    }, // e.g., "USER_LOGIN", "CREATE_BOOKING", "DELETE_USER"
    
    performedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'users', // Links to your User model
        required: false, // Allow system/unknown users for failed logins
        default: null
    },
    
    details: { 
        type: Object 
    }, // Flexible field: store booking IDs, old values, etc.
    
    ipAddress: { 
        type: String 
    },
    
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});

const LogModel = mongoose.model("logs", LogSchema, "logging");

module.exports = LogModel;