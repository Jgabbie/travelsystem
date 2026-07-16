import express from 'express';
import * as preferrencesController from '../controllers/preferrencesController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

router.use(userAuth);

router.post(
    '/save',
    preferrencesController.savePreferrences
);

router.get(
    '/me',
    preferrencesController.getMyPreferrences
);

export default router;
