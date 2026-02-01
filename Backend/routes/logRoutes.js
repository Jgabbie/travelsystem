const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const userAuth = require('../middleware/userAuth');
const UserModel = require('../models/user');

// Ensure only admins can view logs
const adminOnly = async (req, res, next) => {
	try {
		const user = await UserModel.findById(req.userId).lean();
		if (!user || user.role !== 'Admin') {
			return res.status(403).json({ message: 'Forbidden: Admins only' });
		}
		next();
	} catch (err) {
		res.status(500).json({ message: 'Authorization check failed: ' + err.message });
	}
};

router.get('/get-logs', userAuth, adminOnly, logController.getLogs);

module.exports = router;