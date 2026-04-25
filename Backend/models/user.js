const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    phone: { type: String, required: true },
    profileImage: { type: String, default: '' },
    homeAddress: { type: String, default: '' },
    gender: { type: String, default: '' },
    birthdate: { type: String, default: '' },
    nationality: { type: String, default: '' },
    role: { type: String, default: '' },
    verifyOtp: { type: String, default: '' },
    verifyOtpExpireAt: { type: Number, default: 0 },
    isAccountVerified: { type: Boolean, default: false },
    resetOtp: { type: String, default: '' },
    resetOtpExpireAt: { type: Number, default: 0 },
    refreshToken: { type: String, default: '' },
    lastActivityAt: { type: Number, default: 0 },
    loginOnce: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false }
}, { timestamps: true });

const UserModel = mongoose.model("users", UserSchema);

module.exports = UserModel;