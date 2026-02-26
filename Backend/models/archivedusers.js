const mongoose = require("mongoose");

const ArchivedUserSchema = new mongoose.Schema({
    originalUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    username: { type: String, required: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true },
    hashedPassword: { type: String, required: true },
    phone: { type: String, required: true },
    profileImage: { type: String, default: "" },
    role: { type: String, default: "" },
    isAccountVerified: { type: Boolean, default: false },
    archivedAt: { type: Date, default: Date.now }
});

const ArchivedUserModel = mongoose.model("archivedusers", ArchivedUserSchema);

module.exports = ArchivedUserModel;
