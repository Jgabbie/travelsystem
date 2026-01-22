const UserModel = require('../models/user');
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const transporter = require('../config/nodemailer')
const logAction = require('../utils/logger');


//signup
const signupUser = async (req, res) => {
    const { username, firstname, lastname, password, email, phone } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await UserModel.create({ username, firstname, lastname, hashedPassword, email, phone })
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

        //set cookies to store token, to store user.id when signing up and logging in
        res.cookie('token', token, {
            httpOnly: true, //safety from XSS attacks
            secure: false, // if production set true if development set false,  currently development
            sameSite: 'lax', //cross site, cookie is only stored in the current site being used
            maxAge: 7 * 24 * 60 * 60 * 1000 //expiry or the duration of the cookie
        })

        //email to send welcome message to new user

        const otp = String(Math.floor(100000 + Math.random() * 900000)) //generate six digit random number

        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000 //10 minutes timer

        user.verifyToken = token
        user.verifyTokenExpireAt = Date.now() + 15 * 60 * 1000 //15 minutes timer

        user.role = "User" //set the role of the new registered user
        await user.save()

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Verification OTP',
            text: `Your OTP is ${otp}. Verify your account with this OTP.`
        }

        await transporter.sendMail(mailOptions)

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            await logAction("USER_CREATED_ACC", user._id, { 
            username: user.username, email: user.email }, ip);

        // const mailOptions = {
        //     from: process.env.SENDER_EMAIL,
        //     to: email,
        //     subject: 'Welcome to M&RC Travel and Tours',
        //     text: `Welcome to M&RC Travel and Tours website. Your account has been created with email id: ${email}`
        // }

        res.status(200).json({ message: "Signup Successful!", userId: user._id })
    } catch (e) {
        res.status(500).json({ message: "Signup Function failed " + e.message })
    }

};

//login
const loginUser = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await UserModel.findOne({ username })
        if (!user) {
            return res.status(409).json({ message: "Inavlid Username or Password" })
        }

        const matchPass = await bcrypt.compare(password, user.hashedPassword)
        if (!matchPass) {
            return res.status(409).json({ message: "Inavlid Username or Password" })
        }

        // if (!user.isAccountVerified) {
        //     return res.status(403).json({ message: "Account is not verified" })
        // }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await logAction("USER_LOGIN", user._id, { username: user.username }, ip);

        res.status(200).json({ message: "Login Successful!" })

    } catch (e) {
        res.status(500).json({ message: "Login Function failed " + e.message })
    }
}

//check username and email duplicates
const checkDups = async (req, res) => {
    const { username, email } = req.body
    try {
        if (username) {
            const usernameExists = await UserModel.findOne({ username })
            if (usernameExists) {
                return res.status(409).json({ message: "Username already exists." })
            }
        }

        if (email) {
            const emailExists = await UserModel.findOne({ email })
            if (emailExists) {
                return res.status(409).json({ message: "Email already registered" })
            }
        }

        res.status(200).json({ message: "Available" })

    } catch (e) {
        res.status(500).json({ message: "CheckDups Function failed " + e.message })
    }
}

//logout
const logoutUser = async (req, res) => {
    const { token } = req.cookies;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

            const user = await UserModel.findById(decoded.id);
            const logDetails = user ? { username: user.username } : { note: "User not found" };

            await logAction("USER_LOGOUT", decoded.id, logDetails, ip);
            
        } catch (e) {
            console.log("Logout logging skipped (token invalid)");
        }
    }

    // 2. Clear the cookie to actually log them out
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
        })

        res.status(200).json({ message: "Logged Out" })
    } catch (e) {
        res.status(500).json({ message: "Logout Function failed " + e.message })
    }
}

const sendVerifyOtp = async (req, res) => {
    try {
        const userId = req.userId
        const user = await UserModel.findById(userId)

        // if (user.isAccountVerified) {
        //     return res.status(409).json({ message: "Account already verified" })
        // }

        const otp = String(Math.floor(100000 + Math.random() * 900000)) //generate six digit random number

        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000

        await user.save()

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Verification OTP',
            text: `Your OTP is ${otp}. Verify your account with this OTP.`
        }

        await transporter.sendMail(mailOptions)

        res.status(200).json({ message: "OTP has been sent successfully!" })

    } catch (e) {
        res.status(500).json({ message: "Send OTP function failed " + e.message })
    }
}

const verifyEmail = async (req, res) => {
    const { otp } = req.body
    const userId = req.userId

    if (!userId || !otp) {
        return res.status(400).json({ message: "Missing User or OTP" })
    }

    try {
        const user = await UserModel.findById(userId)

        if (!user) {
            return res.status(409).json({ message: "User not found" })
        }

        if (user.verifyOtp === '' || user.verifyOtp !== otp) {
            return res.status(409).json({ message: "Invalid OTP" })
        }

        if (user.verifyOtpExpireAt < Date.now()) {
            return res.status(409).json({ message: "OTP Expired" })
        }

        user.isAccountVerified = true
        user.verifyOtp = ''
        user.verifyOtpExpireAt = 0

        await user.save()
        return res.status(200).json({ message: "Account Verified" })

    } catch (e) {
        res.status(500).json({ message: "Verify Email Function failed " + e.message })
    }
}

// Checks if user is authenticated
// Checks if user is logged in
const isAuthenticated = async (req, res) => {
    try {
        return res.status(200).json({ message: "User is Authenticated" })
    } catch (e) {
        res.status(500).json({ message: "is Authenticated Function failed " + e.message })
    }
}

// Checks if user is verified
const isUserVerified = async (req, res) => {
    try {
        return res.status(200).json({ message: "User is Verified" })
    } catch (e) {
        res.status(500).json({ message: "is User Verified Function failed " + e.message })
    }
}

const sendResetOtp = async (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.status(409).json({ message: "Email is required" })
    }

    try {
        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(409).json({ message: "User not found" })
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000)) //generate six digit random number

        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000

        await user.save()

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password Reset OTP',
            text: `Your OTP for resetting your password is ${otp}. Use this OTP to proceed with resetting your password.`
        }

        await transporter.sendMail(mailOptions)

        return res.status(200).json({ message: "OTP sent to your email" })
    } catch (e) {
        res.status(500).json({ message: "Reset OTP Function failed: " + e.message })
    }
}

const checkResetOtp = async (req, res) => {
    const { email, otp } = req.body
    const user = await UserModel.findOne({ email })
    if (!user) {
        return res.status(409).json({ message: "User not found" })
    }

    if (user.resetOtp === "" || user.resetOtp !== otp) {
        return res.status(409).json({ message: "Invalid OTP" })
    }

    if (user.resetOtpExpireAt < Date.now()) {
        return res.status(409).json({ message: "OTP expired" })
    }

    return res.status(200).json({ message: "Password has been reset successfully" })

}

//Password reset
const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body

    if (!email || !newPassword) {
        return res.status(401).json({ message: "Email and New password is required" })
    }

    try {

        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        console.log("This is the new password: " + newPassword)

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        user.hashedPassword = hashedPassword
        user.resetOtp = ''
        user.resetOtpExpireAt = 0

        console.log(user.hashedPassword)

        const updatedUser = await user.save()

        console.log(updatedUser.hashedPassword)

        return res.status(200).json({ message: "Password has been reset successfully" })

    } catch (e) {
        res.status(500).json({ message: "Reset Password Function failed " + e.message })
    }

}


module.exports = { loginUser, signupUser, checkDups, logoutUser, sendVerifyOtp, verifyEmail, isAuthenticated, sendResetOtp, resetPassword, checkResetOtp, isUserVerified };