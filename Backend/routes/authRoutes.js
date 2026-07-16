import express from 'express';
import * as authController from '../controllers/authController.js';
import userAuth from '../middleware/userAuth.js';
import userVerify from '../middleware/userVerify.js';


import {
    loginLimiter,
    otpRequestLimiter,
    otpVerificationLimiter,
    signupLimiter,
    refreshLimiter
} from "../middleware/authRateLimit.js";

const router = express.Router();

//Authentication Controllers
router.post('/checkDups', authController.checkDups)
router.post('/signupUser', signupLimiter, authController.signupUser)
router.post('/loginUser', loginLimiter, authController.loginUser)
router.post('/allow-login', authController.allowLogin)
router.post('/logoutUser', authController.logoutUser)
router.post('/send-verify-otp', otpRequestLimiter, authController.sendVerifyOtp)
router.post('/verify-account', otpVerificationLimiter, authController.verifyEmail)
router.get('/is-auth', userAuth, authController.isAuthenticated)
router.post('/is-verified', userVerify, authController.isUserVerified)
router.post('/send-reset-otp', refreshLimiter, authController.sendResetOtp)
router.post('/check-reset-otp', authController.checkResetOtp)
router.post('/reset-password', authController.resetPassword)
router.post('/refresh-token', refreshLimiter, authController.refreshToken);

export default router;