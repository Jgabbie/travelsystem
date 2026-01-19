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
                username: user.username,
                isAccountVerified: user.isAccountVerified
            }
        })

    } catch (e) {
        res.status(500).json({ message: "Get User Data Function failed: " + e.message })
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

module.exports = { getUsers, createUsers, delUsers, getUserData };