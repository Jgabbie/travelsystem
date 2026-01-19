const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userAuth = require('../middleware/userAuth')

//Authentication Controllers
router.post('/checkDups', authController.checkDups)
router.post('/signupUser', authController.signupUser)
router.post('/loginUser', authController.loginUser)
router.post('/logoutUser', authController.logoutUser)
router.post('/send-verify-otp', userAuth, authController.sendVerifyOtp)
router.post('/verify-account', userAuth, authController.verifyEmail)
router.post('/is-auth', userAuth, authController.isAuthenticated)
router.post('/send-reset-otp', authController.sendResetOtp)
router.post('/check-reset-otp', authController.checkResetOtp)
router.post('/reset-password', authController.resetPassword)

module.exports = router;