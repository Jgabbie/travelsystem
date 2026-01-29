const UserModel = require('../models/user');
const bcrypt = require("bcryptjs")


const getUserData = async (req, res) => {

    try {
        const { userId } = req
        const user = await UserModel.findById(userId)

        if (!user) {
            return res.status(409).json({ message: "User not found: " + req.body })
        }

        res.json({
            success: true,
            userData: {
                _id: user._id,
                username: user.username,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isAccountVerified: user.isAccountVerified
            }
        })

    } catch (e) {
        res.status(500).json({ message: "Get User Data Function failed: " + e.message })
    }
}

const updateUserData = async (req, res) => {
    try {
        const { userId } = req
        const { firstname, lastname, email, phone } = req.body

        if (!firstname || !lastname || !email || !phone) {
            return res.status(400).json({ message: "All fields are required" })
        }

        const user = await UserModel.findById(userId)

        if (!user) {
            return res.status(409).json({ message: "User not found" })
        }

        // Check if email is already taken by another user
        if (email !== user.email) {
            const existingUser = await UserModel.findOne({ email })
            if (existingUser) {
                return res.status(400).json({ message: "Email already in use" })
            }
        }

        user.firstname = firstname
        user.lastname = lastname
        user.email = email
        user.phone = phone

        await user.save()

        res.json({
            success: true,
            message: "Profile updated successfully",
            userData: {
                _id: user._id,
                username: user.username,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isAccountVerified: user.isAccountVerified
            }
        })

    } catch (e) {
        res.status(500).json({ message: "Update User Data Function failed: " + e.message })
    }
}

const getUsers = (req, res) => {
    UserModel.find()
        .then(users => res.json(users))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.message })
        });
};

const createUsers = async (req, res) => {
    const { username, firstname, lastname, password, email, phone } = req.body;


    UserModel.create({ username, firstname, lastname, password, email, phone })
        .then(user => res.json(user))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.message })
        });
};

const delUsers = (req, res) => {
    const { id } = req.params;

    UserModel.findByIdAndDelete(id)
        .then(user => res.json(user))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.message })
        });
};

module.exports = { getUsers, createUsers, delUsers, getUserData, updateUserData };