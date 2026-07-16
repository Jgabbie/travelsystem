import express from 'express';
import multer from 'multer';
import * as chatbotController from '../controllers/chatbotController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024
	},
	fileFilter: (_req, file, callback) => {
		if (file.mimetype !== 'application/pdf') {
			return callback(
				new Error('Only PDF files are allowed.')
			);
		}

		callback(null, true);
	}
});

const staffOnly = authorizeRoles('Admin', 'Employee');


router.post(
	'/chat',
	chatbotController.chatAction
);

router.post(
	'/knowledge/upload',
	userAuth,
	staffOnly,
	upload.single('file'),
	chatbotController.uploadKnowledge
);

router.get(
	'/knowledge/status',
	userAuth,
	staffOnly,
	chatbotController.knowledgeStatus
);


router.use((error, _req, res, next) => {
	if (error instanceof multer.MulterError) {
		if (error.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({
				error: 'PDF file must not exceed 10 MB.'
			});
		}

		return res.status(400).json({
			error: error.message
		});
	}

	if (error?.message === 'Only PDF files are allowed.') {
		return res.status(400).json({
			error: error.message
		});
	}

	next(error);
});


export default router;