import express from 'express';
import * as preferrencesController from '../controllers/preferrencesController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

router.post('/save', userAuth, preferrencesController.savePreferrences);
router.get('/me', userAuth, preferrencesController.getMyPreferrences);

export default router;
