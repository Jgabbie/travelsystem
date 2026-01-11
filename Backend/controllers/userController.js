const UserModel = require('../models/user');

const getUsers = (req, res) => {
    UserModel.find()
        .then(users => res.json(users))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.message })
        });
};

const createUsers = (req, res) => {
    const { username, password, email, phone } = req.body;

    UserModel.create({ username, password, email, phone })
        .then(user => res.json(user))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.message })
        });
};

module.exports = { getUsers, createUsers };