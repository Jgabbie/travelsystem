const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    username: String,
    firstname: String,
    lastname: String,
    email: String,
    password: String,
    phone: String,
});

const UserModel = mongoose.model("users", UserSchema);

module.exports = UserModel;