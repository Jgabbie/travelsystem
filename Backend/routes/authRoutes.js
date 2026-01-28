const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userAuth = require('../middleware/userAuth')
const userVerify = require('../middleware/userVerify')

//Authentication Controllers
router.post('/checkDups', authController.checkDups)
router.post('/signupUser', authController.signupUser)
router.post('/loginUser', authController.loginUser)
router.post('/logoutUser', authController.logoutUser)
router.post('/send-verify-otp', authController.sendVerifyOtp)
router.post('/verify-account', authController.verifyEmail)
router.post('/is-auth', userAuth, authController.isAuthenticated)
router.post('/is-verified', userVerify, authController.isUserVerified)
router.post('/send-reset-otp', authController.sendResetOtp)
router.post('/check-reset-otp', authController.checkResetOtp)
router.post('/reset-password', authController.resetPassword)
router.post('/refresh-token', authController.refreshToken)

module.exports = router;