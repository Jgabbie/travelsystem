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

        const otp = String(Math.floor(100000 + Math.random() * 900000)) //generate six digit random number
        const hashedOtp = await bcrypt.hash(otp, 10) //hash the otp
        user.verifyOtp = hashedOtp; //set hashed otp to user.otp
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000 //10 minutes timer

        user.role = "User" //set the role of the new registered user
        await user.save() //save new user to database

        const mailOptions = {
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: user.email,
            subject: 'Welcome to M&RC Travel and Tours',
            html: `
            <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
            <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                
                <h2 style="color:#305797; margin-bottom:10px;">
                    Welcome to M&RC Travel and Tours
                </h2>

                <p style="color:#555; font-size:16px;">
                    Hello <b>${user.username}</b>,
                </p>

                <p style="color:#555; font-size:15px; line-height:1.6;">
                    Your account has been successfully created! We're excited to help you explore amazing destinations and create unforgettable travel experiences.
                </p>

                <p style="color:#555; font-size:15px; line-height:1.6;">
                    You can now log in to your account and start browsing our travel packages, tours, and exclusive offers.
                </p>

                <a href="http://localhost:3000/home"
                    style="
                        display:inline-block;
                        margin-top:25px;
                        padding:12px 28px;
                        background:#305797;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:6px;
                        font-weight:bold;
                        font-size:14px;
                    ">
                    Explore Tours
                </a>

                <p style="color:#777; font-size:13px; margin-top:30px;">
                    If you did not create this account, please ignore this email.
                </p>

                <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                <p style="color:#aaa; font-size:12px;">
                    © ${new Date().getFullYear()} M&RC Travel and Tours <br/>
                    Making your travel dreams come true.
                </p>

            </div>
        </div>
            `
        }

        await transporter.sendMail(mailOptions)

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; //ip???
        await logAction("USER_CREATED_ACC", user._id, { //log action for account creation
            username: user.username, email: user.email
        }, ip);

        res.status(200).json({ message: "Signup Successful!", userId: user._id })
    } catch (e) {
        res.status(500).json({ message: "Signup Function failed " + e.message })
    }
};

//login
const loginUser = async (req, res) => {
    const { username, password } = req.body;

    // Capture IP immediately for logging
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
        const user = await UserModel.findOne({ username })
        if (!user) {
            return res.status(401).json({ message: "Invalid Username or Password" })
        }

        const matchPass = await bcrypt.compare(password, user.hashedPassword)
        if (!matchPass) {
            await logAction("LOGIN_FAILED", user._id, { reason: "Incorrect Password" }, ip);
            return res.status(401).json({ message: "Invalid Username or Password" })
        }

        if (!user.isAccountVerified) {
            return res.status(403).json({ message: "Account is not verified", email: user.email, })
        }

        const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' })
        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_REFRESH_KEY, { expiresIn: '7d' })

        user.refreshToken = refreshToken
        await user.save()

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000
        })

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        // Check role to determine action name
        //LOG SUCCESSFUL LOGIN
        const actionName = user.role === 'Admin' ? "ADMIN_LOGIN" : "USER_LOGIN";
        await logAction(actionName, user._id, { username: user.username }, ip);

        res.status(200).json({
            message: "Login Successful!",
            accessToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        })

    } catch (e) {
        res.status(500).json({ message: "Login Function failed " + e.message })
    }
}

const refreshToken = async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token provided" });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET_REFRESH_KEY);
        const user = await UserModel.findById(decoded.id);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' });

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000
        });

        res.status(200).json({ message: "Access token refreshed" });
    } catch (err) {
        res.status(500).json({ message: "Refresh Token Function failed " + err.message });
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

    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            res.clearCookie('accessToken')
            res.clearCookie('refreshToken')
            return res.status(200).json({ message: "Logged Out" })
        }

        const user = await UserModel.findOne({ refreshToken })
        if (user) {
            user.refreshToken = ''
            await user.save()
        }

        res.clearCookie('accessToken', { httpOnly: true, secure: false, sameSite: 'lax', path: '/' })
        res.clearCookie('refreshToken', { httpOnly: true, secure: false, sameSite: 'lax', path: '/' })
        res.clearCookie('token', { httpOnly: true, secure: false, sameSite: 'lax', path: '/' })

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Determine action based on the user found (if any)
        const actionName = (user && user.role === 'Admin') ? "ADMIN_LOGOUT" : "USER_LOGOUT";

        await logAction(
            actionName,
            user ? user._id : null,
            { username: user ? user.username : 'Unknown' },
            ip
        );

        res.status(200).json({ message: "Logged Out" })
    }

    catch (e) {
        res.status(500).json({ message: "Logout Function failed " + e.message })
    }
}

const sendVerifyOtp = async (req, res) => {
    try {
        const { email } = req.body
        console.log("Email:" + email)
        const user = await UserModel.findOne({ email: email })

        if (!user) {
            return res.status(405).json({ message: "User not found" })
        }

        if (user.isAccountVerified) {
            return res.status(409).json({ message: "Account already verified" })
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000)) //generate six digit random number
        const hashedOtp = await bcrypt.hash(otp, 10)
        user.verifyOtp = hashedOtp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000

        await user.save()

        const mailOptions = {
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: user.email,
            subject: 'M&RC Travel and Tours - Account Verification OTP',
            html: `
            <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
                <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                    
                    <h2 style="color:#305797; margin-bottom:10px;">
                        M&RC Travel and Tours
                    </h2>

                    <p style="color:#555; font-size:16px;">
                        Verify your account using the OTP below
                    </p>

                    <div style="
                        margin:25px 0;
                        font-size:32px;
                        font-weight:bold;
                        letter-spacing:8px;
                        color:#992A46;
                        background:#f9fafb;
                        padding:15px;
                        border-radius:8px;
                        border:1px dashed #ddd;
                    ">
                        ${otp}
                    </div>

                    <p style="color:#777; font-size:14px;">
                        This OTP will expire in <b>5 minutes</b>.
                    </p>

                    <p style="color:#aaa; font-size:12px; margin-top:30px;">
                        If you did not request this verification, please ignore this email.
                    </p>

                </div>
            </div>
            `
        }

        await transporter.sendMail(mailOptions)

        res.status(200).json({ message: "OTP has been sent successfully!" })

    } catch (e) {
        res.status(500).json({ message: "Send OTP function failed " + e.message })
    }
}

const verifyEmail = async (req, res) => {
    const { otp, email, username, password } = req.body

    try {
        const user = await UserModel.findOne({ email })

        if (!user) {
            return res.status(409).json({ message: "User not found" })
        }

        if (user.verifyOtpExpireAt < Date.now()) {
            return res.status(409).json({ message: "OTP Expired" })
        }

        const matchOtp = await bcrypt.compare(otp, user.verifyOtp)
        if (!matchOtp) {
            return res.status(409).json({ message: "Invalid OTP" })
        }

        user.isAccountVerified = true
        user.verifyOtp = ''
        user.verifyOtpExpireAt = 0

        await user.save()

        //login function after successful verification
        const userName = await UserModel.findOne({ username })
        if (!userName) {
            return res.status(401).json({ message: "Invalid Username or Password" })
        }

        const matchPass = await bcrypt.compare(password, userName.hashedPassword)
        if (!matchPass) {
            await logAction("LOGIN_FAILED", userName._id, { reason: "Incorrect Password" });
            return res.status(401).json({ message: "Invalid Username or Password" })
        }

        if (!userName.isAccountVerified) {
            return res.status(403).json({ message: "Account is not verified", email: userName.email, })
        }

        const accessToken = jwt.sign({ id: userName._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' })
        const refreshToken = jwt.sign({ id: userName._id }, process.env.JWT_SECRET_REFRESH_KEY, { expiresIn: '7d' })

        userName.refreshToken = refreshToken
        await userName.save()

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000
        })

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })


        // Check role to determine action name
        //LOG SUCCESSFUL LOGIN
        const actionName = userName.role === 'Admin' ? "ADMIN_LOGIN" : "USER_LOGIN";
        await logAction(actionName, userName._id, { username: userName.username });

        res.status(200).json({
            message: "Login Successful!",
            accessToken,
            user: {
                id: userName._id,
                username: userName.username,
                email: userName.email,
                role: userName.role
            }
        })

    } catch (e) {
        res.status(500).json({ message: "Verify Email Function failed " + e.message })
    }
}

// Checks if user is authenticated
// Checks if user is logged in
const isAuthenticated = async (req, res) => {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ message: "User is not Authenticated" })
        }
        const currentUser = await UserModel.findById(userId)

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({
            message: "User is Authenticated",
            user: {
                id: currentUser._id,
                username: currentUser.username,
                email: currentUser.email,
                role: currentUser.role
            }
        })
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
            return res.status(409).json({ message: "Email is not registered" })
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000)) //generate six digit random number
        const hashedOtp = await bcrypt.hash(otp, 10)
        user.resetOtp = hashedOtp;
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
        return res.status(409).json({ message: "Email is not registered" })
    }

    if (user.resetOtpExpireAt < Date.now()) {
        return res.status(409).json({ message: "OTP expired" })
    }

    const isValidOtp = await bcrypt.compare(otp, user.resetOtp)
    if (!isValidOtp) {
        return res.status(409).json({ message: "Invalid OTP" })
    }

    const resetToken = jwt.sign({ id: user._id, scope: "password-reset" }, process.env.JWT_SECRET_RESET_KEY, { expiresIn: '5m' })

    user.resetOtp = ''
    user.resetOtpExpireAt = ''

    await user.save

    return res.status(200).json({ message: "You can now reset your password", resetToken })
}

//Password reset
const resetPassword = async (req, res) => {
    const { newPassword, token } = req.body

    if (!token || !newPassword) {
        return res.status(401).json({ message: "Token and new password is required" })
    }

    try {

        let payload
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET_RESET_KEY)
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired token" })
        }

        const user = await UserModel.findById(payload.id)
        if (!user) {
            return res.status(409).json({ message: "User not found" })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        user.hashedPassword = hashedPassword
        user.resetOtp = ''
        user.resetOtpExpireAt = 0

        await user.save()

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await logAction("PASSWORD_CHANGE", user._id, { method: "Reset via Email" }, ip);

        return res.status(200).json({ message: "Password has been reset successfully" })

    } catch (e) {
        res.status(500).json({ message: "Reset Password Function failed " + e.message })
    }

}


module.exports = { loginUser, signupUser, checkDups, logoutUser, sendVerifyOtp, verifyEmail, isAuthenticated, sendResetOtp, resetPassword, checkResetOtp, isUserVerified, refreshToken };