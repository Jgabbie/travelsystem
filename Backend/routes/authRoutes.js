import express from 'express';
import * as authController from '../controllers/authController.js';
import userAuth from '../middleware/userAuth.js';
import userVerify from '../middleware/userVerify.js';

const router = express.Router();

//Authentication Controllers
router.post('/checkDups', authController.checkDups)
router.post('/signupUser', authController.signupUser)
router.post('/loginUser', authController.loginUser)
router.post('/allow-login', authController.allowLogin)
router.post('/logoutUser', authController.logoutUser)
router.post('/send-verify-otp', authController.sendVerifyOtp)
router.post('/verify-account', authController.verifyEmail)
router.get('/is-auth', userAuth, authController.isAuthenticated)
router.post('/is-verified', userVerify, authController.isUserVerified)
router.post('/send-reset-otp', authController.sendResetOtp)
router.post('/check-reset-otp', authController.checkResetOtp)
router.post('/reset-password', authController.resetPassword)
router.post('/refresh-token', authController.refreshToken)
router.get('/refresh', authController.refreshToken)

export default router;