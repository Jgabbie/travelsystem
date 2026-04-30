const UserModel = require('../models/user');
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const transporter = require('../config/nodemailer')
const logAction = require('../utils/logger');
const connectToDatabase = require('../utils/mongodb');

const {
    clearAuthCookies,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    IDLE_LOGOUT_MESSAGE,
    isSessionIdleExpired,
} = require('../utils/sessionAuth');


// CREATE VERIFICATION LINK AND SEND EMAIL
const createVerificationLink = async (email, token) => {

    const user = await UserModel.findOne({ email: email })

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(rawToken, 10);

    user.emailVerifyOtp = hashedToken;
    user.emailVerifyExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const clientUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyLink = `${clientUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    user.role = "Customer" //set the role of the new registered user
    await user.save() //save new user to database


    //in order to send email with Logo, use hosted url
    const mailOptions = {
        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
        to: user.email,
        subject: 'Welcome to M&RC Travel and Tours',
        html: `
            <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
            <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                <h2 style="color:#305797; margin-bottom:10px;">
                    Welcome to M&RC Travel and Tours
                </h2>

                <p style="color:#555; font-size:16px;">
                    Hello <b>${user.username}</b>,
                </p>

                <p style="color:#555; font-size:15px; line-height:1.6;">
                    Your account has been successfully created!
                </p>

                <p style="color:#555; font-size:15px; line-height:1.6;">
                    Kindly click the button below to verify your email address and activate your account.
                </p>

                <a href="${verifyLink}"
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
                    Verify Account
                </a>

                <p style="color:#777; font-size:13px; margin-top:30px;">
                    If you did not create this account, please ignore this email.
                </p>

                <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                    
                    <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                    <p>M&RC Travel and Tours</p>
                    <p>info1@mrctravels.com</p>
                    <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                </div>
            </div>
        </div>
            `
    }

    await transporter.sendMail(mailOptions)

    return verifyLink;
}


//SIGNUP FUNCTION
const signupUser = async (req, res) => {
    const { username, firstname, lastname, password, email, phone } = req.body;

    try {

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await UserModel.create({ username, firstname, lastname, hashedPassword, email, phone })

        await createVerificationLink(email, user.emailVerifyOtp)

        await logAction("CUSTOMER_CREATED_ACC", user._id, { //log action for account creation
            Username: user.username,
            Email: user.email
        });

        const io = req.app.get('io')
        if (io) {
            io.emit('user:created', {
                id: user._id,
                createdAt: user.createdAt
            })
        }

        res.status(200).json({ message: "Signup Successful!", userId: user._id })

    } catch (e) {
        res.status(500).json({ message: "Signup Function failed " + e.message })
    }
};


//LOGIN FUNCTION
const loginUser = async (req, res) => {
    const { username, password } = req.body;
    await connectToDatabase();
    try {
        const user = await UserModel.findOne({ username })

        if (!user) {
            return res.status(401).json({ message: "Invalid Username or Password" })
        }

        const matchPass = await bcrypt.compare(password, user.hashedPassword)
        if (!matchPass) {
            await logAction("LOGIN_FAILED", user._id, { Username: username });
            return res.status(401).json({ message: "Invalid Username or Password" })
        }

        if (!user.isAccountVerified) {
            await createVerificationLink(user.email, user.emailVerifyOtp)

            await logAction("ACCOUNT_NOT_VERIFIED", user._id, { Username: username });
            return res.status(403).json({ message: "Account is not verified, a verification email has been sent to your email address.", email: user.email, })
        }

        const rawOtp = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOtp = await bcrypt.hash(rawOtp, 10);

        user.verifyOtp = hashedOtp;
        user.verifyOtpExpireAt = Date.now() + 70 * 1000;
        user.otpAttempts = 0;
        user.otpBlockedUntil = 0;
        await user.save();

        const mailOptions = {
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: user.email,
            subject: 'M&RC Travel and Tours - Login OTP',
            html: `
            <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                    <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />
                    <h2 style="color:#305797; margin-bottom:10px;">M&RC Travel and Tours</h2>
                    <p style="color:#555; font-size:16px;">Use the OTP below to complete your login.</p>
                    <div style="margin:25px 0; font-size:32px; font-weight:bold; letter-spacing:8px; color:#992A46; background:#f9fafb; padding:15px; border-radius:8px; border:1px dashed #ddd;">${rawOtp}</div>
                    <p style="color:#777; font-size:14px;">This OTP will expire in <b>1 minute</b>.</p>
                    <p style="color:#aaa; font-size:12px; margin-top:30px;">If you did not try to log in, please ignore this email.</p>
                    <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                        <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                        <p>M&RC Travel and Tours</p>
                        <p>info1@mrctravels.com</p>
                        <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                    </div>
                </div>
            </div>
            `
        }

        await transporter.sendMail(mailOptions)

        await logAction("LOGIN_OTP_SENT", user._id, { Username: user.username });

        return res.status(200).json({
            message: "OTP sent to your email address",
            otpRequired: true,
            email: user.email,
        })

        const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' })
        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_REFRESH_KEY, { expiresIn: '7d' })

        user.refreshToken = refreshToken
        user.lastActivityAt = Date.now()
        await user.save()

        setAccessTokenCookie(res, accessToken)
        setRefreshTokenCookie(res, refreshToken)

        // Check role to determine action name
        //LOG SUCCESSFUL LOGIN
        const actionName = user.role === 'Admin' ? "ADMIN_LOGIN" : user.role === 'Employee' ? "EMPLOYEE_LOGIN" : "CUSTOMER_LOGIN";
        await logAction(actionName, user._id, { Username: user.username });

        res.status(200).json({
            message: "Login Successful!",
            user: {
                username: user.username,
                profileImage: user.profileImage,
                role: user.role,
                loginOnce: user.loginOnce
            }
        })

    } catch (e) {
        res.status(500).json({ message: "Login Function failed " + e.message })
    }
}


//ALLOW LOGIN AFTER CHECKING OTP
const allowLogin = async (req, res) => {
    const { email, otp } = req.body

    const user = await UserModel.findOne({ email })
    if (!user) {
        return res.status(409).json({ message: "User not found" })
    }

    if (user.verifyOtpExpireAt < Date.now()) {
        return res.status(409).json({ message: "OTP Expired" })
    }

    if (user.otpBlockedUntil > Date.now()) {
        return res.status(429).json({ message: "Too many attempts. Try again in 5 minutes." });
    }

    const matchOtp = await bcrypt.compare(otp, user.verifyOtp)

    if (!matchOtp) {
        user.otpAttempts += 1;

        if (user.otpAttempts >= 5) {
            user.otpBlockedUntil = Date.now() + 5 * 60 * 1000
            user.otpAttempts = 0
        }

        await user.save();

        return res.status(409).json({ message: "Invalid OTP" });
    }

    // reset on success
    user.otpAttempts = 0;
    user.otpBlockedUntil = 0;

    user.verifyOtp = ''
    user.verifyOtpExpireAt = 0

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' })
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_REFRESH_KEY, { expiresIn: '7d' })

    user.refreshToken = refreshToken
    user.lastActivityAt = Date.now()
    await user.save()

    setAccessTokenCookie(res, accessToken)
    setRefreshTokenCookie(res, refreshToken)

    const actionName = user.role === 'Admin' ? "ADMIN_LOGIN" : user.role === 'Employee' ? "EMPLOYEE_LOGIN" : "CUSTOMER_LOGIN";
    await logAction(actionName, user._id, { Username: user.username });

    return res.status(200).json({
        message: "Login Successful!",
        user: {
            username: user.username,
            profileImage: user.profileImage,
            role: user.role,
            loginOnce: user.loginOnce
        }
    })
}


//REFRESH TOKEN FUNCTION
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

        if (isSessionIdleExpired(user.lastActivityAt)) {
            user.refreshToken = ''
            user.lastActivityAt = 0
            await user.save()
            clearAuthCookies(res)
            return res.status(401).json({ message: IDLE_LOGOUT_MESSAGE, idleLogout: true })
        }

        const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' });

        setAccessTokenCookie(res, newAccessToken);

        user.lastActivityAt = Date.now()
        await user.save()

        res.status(200).json({ message: "Access token refreshed", accessToken: newAccessToken });
    } catch (err) {
        res.status(500).json({ message: "Refresh Token Function failed " + err.message });
    }
}


//CHECK DUPLICATE USERNAME OR EMAIL
const checkDups = async (req, res) => {
    const { username, email } = req.body
    await connectToDatabase();
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


//LOGOUT FUNCTION
const logoutUser = async (req, res) => {

    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' })
            res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' })
            return res.status(200).json({ message: "Logged Out" })
        }

        const user = await UserModel.findOne({ refreshToken })
        if (user) {
            user.refreshToken = ''
            user.lastActivityAt = 0
            await user.save()
        }

        clearAuthCookies(res)
        res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' })


        // Determine action based on the user found (if any)
        const actionName = user.role === 'Admin' ? "ADMIN_LOGOUT" : user.role === 'Employee' ? "EMPLOYEE_LOGOUT" : "CUSTOMER_LOGOUT";
        await logAction(actionName, user._id, { Username: user.username });

        res.status(200).json({ message: "Logged Out" })
    }

    catch (e) {
        res.status(500).json({ message: "Logout Function failed " + e.message })
    }
}


//SEND OTP FOR EMAIL VERIFICATION
const sendVerifyOtp = async (req, res) => {
    try {
        const { email } = req.body
        const user = await UserModel.findOne({ email: email })

        if (!user) {
            return res.status(405).json({ message: "User not found" })
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000)) //generate six digit random number
        const hashedOtp = await bcrypt.hash(otp, 10)
        user.verifyOtp = hashedOtp;
        user.verifyOtpExpireAt = Date.now() + 70 * 1000

        await user.save()

        const mailOptions = {
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: user.email,
            subject: 'M&RC Travel and Tours - Account Verification OTP',
            html: `
            <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                    
                    <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

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
                        This OTP will expire in <b>1 minute</b>.
                    </p>

                    <p style="color:#aaa; font-size:12px; margin-top:30px;">
                        If you did not request this verification, please ignore this email.
                    </p>

                    <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                        <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                        <p>M&RC Travel and Tours</p>
                        <p>info1@mrctravels.com</p>
                        <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                    </div>

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


//VERIFY EMAIL FUNCTION
const verifyEmail = async (req, res) => {
    const { email, token } = req.body

    try {
        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(409).json({ message: "User not found" })
        }
        if (token) {
            if (user.emailVerifyExpireAt < Date.now()) {
                return res.status(409).json({ message: "Verification link expired" })
            }
            const matchToken = await bcrypt.compare(token, user.emailVerifyOtp)
            if (!matchToken) {
                return res.status(409).json({ message: "Invalid verification link" })
            }
        }

        user.emailVerifyOtp = ''
        user.emailVerifyExpireAt = 0
        user.isAccountVerified = true
        await user.save();

        return res.status(200).json({
            message: "Account verified",
            user: {
                username: user.username,
                role: user.role,
                profileImage: user.profileImage,
                loginOnce: user.loginOnce
            }
        });
    } catch (e) {
        res.status(500).json({ message: "Verify Email Function failed " + e.message })
    }
}


// CHECKS IF USER IS AUTHENTICATED
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
                username: currentUser.username,
                profileImage: currentUser.profileImage,
                role: currentUser.role,
                loginOnce: currentUser.loginOnce
            }
        })
    } catch (e) {
        res.status(500).json({ message: "is Authenticated Function failed " + e.message })
    }
}


// CHECKS IF USER IS VERIFIED (FOR FRONTEND TO KNOW WHETHER TO SHOW VERIFY ACCOUNT MODAL OR NOT)
const isUserVerified = async (req, res) => {
    try {
        return res.status(200).json({ message: "User is Verified" })
    } catch (e) {
        res.status(500).json({ message: "is User Verified Function failed " + e.message })
    }
}


//SEND OTP FOR PASSWORD RESET
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
        user.resetOtpExpireAt = Date.now() + 60 * 1000

        await user.save()

        const mailOptions = {
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: user.email,
            subject: 'M&RC Travel and Tours - Password Reset OTP',
            html: `
            <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                    
                    <h2 style="color:#305797; margin-bottom:10px;">
                        M&RC Travel and Tours
                    </h2>

                    <p style="color:#555; font-size:16px;">
                        Reset your password using the OTP below
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
                        This OTP will expire in <b>1 minute</b>.
                    </p>

                    <p style="color:#aaa; font-size:12px; margin-top:30px;">
                        If you did not request this password reset, please ignore this email.
                    </p>

                    <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                        <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                            <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                            <p>M&RC Travel and Tours</p>
                            <p>info1@mrctravels.com</p>
                            <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                        </div>

                </div>
            </div>
            `
        }

        await transporter.sendMail(mailOptions)

        return res.status(200).json({ message: "OTP sent to your email" })
    } catch (e) {
        res.status(500).json({ message: "Reset OTP Function failed: " + e.message })
    }
}


// CHECKS THE OTP FOR PASSWORD RESET
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

    await user.save()

    return res.status(200).json({ message: "You can now reset your password", resetToken })
}


//PASSWORD RESET FUNCTION
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

        await logAction("PASSWORD_CHANGE", user._id, { Username: user.username });

        return res.status(200).json({ message: "Password has been reset successfully" })

    } catch (e) {
        res.status(500).json({ message: "Reset Password Function failed " + e.message })
    }

}


module.exports = { loginUser, allowLogin, signupUser, checkDups, logoutUser, sendVerifyOtp, verifyEmail, isAuthenticated, sendResetOtp, resetPassword, checkResetOtp, isUserVerified, refreshToken };
