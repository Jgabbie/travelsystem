const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, default: '' },
    verifyOtp: { type: String, default: '' },
    verifyOtpExpireAt: { type: Number, default: 0 },
    isAccountVerified: { type: Boolean, default: false },
    resetOtp: { type: String, default: '' },
    resetOtpExpireAt: { type: Number, default: 0 },
    resetToken: { type: String, default: '' },
    resetTokenExpireAt: { type: Number, default: 0 },
    verifyToken: { type: String, default: '' },
    verifyTokenExpireAt: { type: Number, default: 0 },
});

const UserModel = mongoose.model("users", UserSchema);

module.exports = UserModel;