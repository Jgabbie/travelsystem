import express from 'express';
import * as logController from '../controllers/logController.js';
import userAuth from '../middleware/userAuth.js';
import UserModel from '../models/user.js';

const router = express.Router();

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
router.get('/get-audits', userAuth, adminOnly, logController.getAudits);

export default router;