import UserModel from '../models/user.js';
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import transporter from '../config/nodemailer.js';
import logAction from '../utils/logger.js';
import connectToDatabase from '../utils/mongodb.js';
import { buildBrandedEmail } from '../utils/emailTemplate.js';


import {
    clearAuthCookies,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    IDLE_LOGOUT_MESSAGE,
    isSessionIdleExpired,
} from '../utils/sessionAuth.js';


const normalizeEmail = value => {
    return typeof value === "string"
        ? value.trim().toLowerCase()
        : "";
};

const normalizeUsername = value => {
    return typeof value === "string"
        ? value.trim()
        : "";
};

const hashToken = token => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

const createOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

const createAccessToken = userId => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET_ACCESS_KEY,
        { expiresIn: "2h" }
    );
};

const createRefreshToken = userId => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET_REFRESH_KEY,
        { expiresIn: "7d" }
    );
};


// create verification link and send email
const createVerificationLink = async (email, token) => {

    const user = await UserModel.findOne({ email: email })

    if (!user) {
        return null;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.emailVerifyOtp = hashToken(rawToken);
    user.emailVerifyExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const clientUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyLink = `${clientUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    await user.save() //save new user to database


    //in order to send email with Logo, use hosted url
    const mailOptions = {
        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
        to: user.email,
        subject: 'Welcome to M&RC Travel and Tours',
        html: buildBrandedEmail({
            title: 'Welcome to M&RC Travel and Tours',
            introHtml: `Hello <strong>${user.username}</strong>,`,
            bodyHtml: `
                <p style="margin:0 0 12px;">Your account has been successfully created!</p>
                <p style="margin:0;">Kindly click the button below to verify your email address and activate your account.</p>
                <p style="margin:18px 0 0; font-size:13px; color:#64748b;">If you did not create this account, please ignore this email.</p>
            `,
            ctaText: 'Verify Account',
            ctaUrl: verifyLink,
        })
    }

    await transporter.sendMail(mailOptions)

    return verifyLink;
}


//signup function
// const signupUser = async (req, res) => {
//     const { username, firstname, lastname, password, email, phone } = req.body;

//     try {

//         const cleanedPhoneNum = phone.replace(/\D/g, ''); //removed spaces

//         const hashedPassword = await bcrypt.hash(password, 10)
//         const user = await UserModel.create({
//             username,
//             firstname,
//             lastname,
//             hashedPassword,
//             email,
//             phone: cleanedPhoneNum
//         })

//         await createVerificationLink(email, user.emailVerifyOtp)

//         await logAction("CUSTOMER_CREATED_ACC", user._id, { //log action for account creation
//             Username: user.username,
//             Email: user.email
//         });

//         const io = req.app.get('io')
//         if (io) {
//             io.emit('user:created', {
//                 id: user._id,
//                 createdAt: user.createdAt
//             })
//         }

//         res.status(200).json({ message: "Signup Successful!", userId: user._id })

//     } catch (e) {
//         res.status(500).json({ message: "Signup Function failed " + e.message })
//     }
// };


const signupUser = async (req, res) => {
    const username = normalizeUsername(req.body.username);
    const firstname =
        typeof req.body.firstname === "string"
            ? req.body.firstname.trim()
            : "";

    const lastname =
        typeof req.body.lastname === "string"
            ? req.body.lastname.trim()
            : "";

    const email = normalizeEmail(req.body.email);

    const password =
        typeof req.body.password === "string"
            ? req.body.password
            : "";

    const phone =
        typeof req.body.phone === "string"
            ? req.body.phone.replace(/\D/g, "")
            : "";

    if (
        !username ||
        !firstname ||
        !lastname ||
        !email ||
        !password ||
        !phone
    ) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must contain at least 8 characters"
        });
    }

    try {
        const existingUser = await UserModel.findOne({
            $or: [
                { username },
                { email },
                { phone }
            ]
        }).lean();

        if (existingUser) {
            return res.status(409).json({
                message: "Unable to create account using the provided information"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await UserModel.create({
            username,
            firstname,
            lastname,
            hashedPassword,
            email,
            phone,

            // Never accept role from req.body.
            role: "Customer",

            isAccountVerified: false
        });

        await createVerificationLink(user.email);

        await logAction(
            "CUSTOMER_CREATED_ACC",
            user._id,
            {
                Username: user.username,
                Email: user.email
            }
        );

        const io = req.app.get("io");

        if (io) {
            io.emit("user:created", {
                id: user._id,
                createdAt: user.createdAt
            });
        }

        return res.status(201).json({
            message: "Signup successful. Check your email to verify your account.",
            userId: user._id
        });
    } catch (error) {
        console.error("Signup error:", error);

        if (error?.code === 11000) {
            return res.status(409).json({
                message: "Unable to create account using the provided information"
            });
        }

        return res.status(500).json({
            message: "Unable to create account"
        });
    }
};


//login function
const loginUser = async (req, res) => {
    const { username, password } = req.body;
    await connectToDatabase();
    try {
        const user = await UserModel.findOne({ username })

        if (!user) {
            return res.status(401).json({ message: "Invalid Username or Password" })
        }

        if (user.loginBlockedUntil && user.loginBlockedUntil > Date.now()) {
            return res.status(429).json({
                message: "Too many failed login attempts. Try again in 5 minutes."
            });
        }



        const matchPass = await bcrypt.compare(password, user.hashedPassword)
        if (!matchPass) {
            user.loginAttempts += 1;

            if (user.loginAttempts >= 3) {
                user.loginBlockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
                user.loginAttempts = 0;
            }

            await user.save();

            await logAction("LOGIN_FAILED", user._id, {
                Username: username
            });

            return res.status(401).json({
                message: "Invalid Username or Password"
            });
        }

        if (!user.isAccountVerified) {
            await createVerificationLink(user.email, user.emailVerifyOtp)

            await logAction("ACCOUNT_NOT_VERIFIED", user._id, { Username: username });
            return res.status(403).json({ message: "Account is not verified, a verification email has been sent to your email address.", email: user.email, })
        }

        const rawOtp = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOtp = await bcrypt.hash(rawOtp, 10);

        user.loginAttempts = 0;
        user.loginBlockedUntil = null;
        user.verifyOtp = hashedOtp;
        user.verifyOtpExpireAt = Date.now() + 70 * 1000;
        user.otpAttempts = 0;
        user.otpBlockedUntil = 0;
        await user.save();

        const mailOptions = {
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: user.email,
            subject: 'M&RC Travel and Tours - Login OTP',
            html: buildBrandedEmail({
                title: 'Login OTP',
                introHtml: 'Use the OTP below to complete your login.',
                bodyHtml: `
                    <div style="margin:8px 0 14px; font-size:32px; font-weight:700; letter-spacing:8px; color:#992A46; background:#f8fafc; padding:14px 16px; border-radius:10px; border:1px dashed #cbd5e1; text-align:center;">${rawOtp}</div>
                    <p style="margin:0 0 10px;">This OTP will expire in <strong>1 minute</strong>.</p>
                    <p style="margin:0; font-size:13px; color:#64748b;">If you did not try to log in, please ignore this email.</p>
                `,
            })
        }

        await transporter.sendMail(mailOptions)

        await logAction("LOGIN_OTP_SENT", user._id, { "Login OTP": `OTP sent to ${user.email}` });

        return res.status(200).json({
            message: "OTP sent to your email address",
            otpRequired: true,
            email: user.email,
        })

        // const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' })
        // const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_REFRESH_KEY, { expiresIn: '7d' })

        // user.refreshToken = refreshToken
        // user.lastActivityAt = Date.now()
        // await user.save()

        // setAccessTokenCookie(res, accessToken)
        // setRefreshTokenCookie(res, refreshToken)

        // // Check role to determine action name
        // //LOG SUCCESSFUL LOGIN
        // const actionName = user.role === 'Admin' ? "ADMIN_LOGIN" : user.role === 'Employee' ? "EMPLOYEE_LOGIN" : "CUSTOMER_LOGIN";
        // await logAction(actionName, user._id, { Username: user.username });

        // res.status(200).json({
        //     message: "Login Successful!",
        //     user: {
        //         username: user.username,
        //         firstName: user.firstname,
        //         lastName: user.lastname,
        //         profileImage: user.profileImage,
        //         role: user.role,
        //         loginOnce: user.loginOnce
        //     }
        // })

    } catch (e) {
        res.status(500).json({ message: "Login Function failed " + e.message })
    }
}


//allow login function (after OTP verification)
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

        if (user.otpAttempts >= 3) {
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

    // const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' })
    // const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_REFRESH_KEY, { expiresIn: '7d' })

    // user.refreshToken = refreshToken
    // user.lastActivityAt = Date.now()
    // await user.save()

    // setAccessTokenCookie(res, accessToken)
    // setRefreshTokenCookie(res, refreshToken)

    const accessToken = createAccessToken(user._id);
    const refreshToken = createRefreshToken(user._id);

    user.refreshToken = hashToken(refreshToken);
    user.lastActivityAt = Date.now();

    await user.save();

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    const actionName = user.role === 'Admin' ? "ADMIN_LOGIN" : user.role === 'Employee' ? "EMPLOYEE_LOGIN" : "CUSTOMER_LOGIN";
    await logAction(actionName, user._id, { Username: user.username });

    return res.status(200).json({
        message: "Login Successful!",
        user: {
            username: user.username,
            firstName: user.firstname,
            lastName: user.lastname,
            profileImage: user.profileImage,
            role: user.role,
            loginOnce: user.loginOnce
        }
    })
}


//refresh token function
// const refreshToken = async (req, res) => {
//     const { refreshToken } = req.cookies;
//     if (!refreshToken) {
//         return res.status(401).json({ message: "No refresh token provided" });
//     }

//     try {
//         const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET_REFRESH_KEY);
//         const user = await UserModel.findById(decoded.id);
//         if (!user || user.refreshToken !== refreshToken) {
//             return res.status(403).json({ message: "Invalid refresh token" });
//         }

//         if (isSessionIdleExpired(user.lastActivityAt)) {
//             user.refreshToken = ''
//             user.lastActivityAt = 0
//             await user.save()
//             clearAuthCookies(res)
//             return res.status(401).json({ message: IDLE_LOGOUT_MESSAGE, idleLogout: true })
//         }

//         const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' });

//         setAccessTokenCookie(res, newAccessToken);

//         user.lastActivityAt = Date.now()
//         await user.save()

//         res.status(200).json({ message: "Access token refreshed", accessToken: newAccessToken });
//     } catch (err) {
//         res.status(500).json({ message: "Refresh Token Function failed " + err.message });
//     }
// }


const refreshToken = async (req, res) => {
    const receivedRefreshToken = req.cookies?.refreshToken;

    if (!receivedRefreshToken) {
        clearAuthCookies(res);

        return res.status(401).json({
            message: "Authentication required"
        });
    }

    try {
        const decoded = jwt.verify(
            receivedRefreshToken,
            process.env.JWT_SECRET_REFRESH_KEY
        );

        const user = await UserModel.findById(decoded.id);

        if (!user || !user.refreshToken) {
            clearAuthCookies(res);

            return res.status(401).json({
                message: "Invalid session"
            });
        }

        const receivedTokenHash =
            hashToken(receivedRefreshToken);

        const storedBuffer = Buffer.from(
            user.refreshToken,
            "hex"
        );

        const receivedBuffer = Buffer.from(
            receivedTokenHash,
            "hex"
        );

        const tokenMatches =
            storedBuffer.length === receivedBuffer.length &&
            crypto.timingSafeEqual(
                storedBuffer,
                receivedBuffer
            );

        if (!tokenMatches) {
            /*
             * A mismatched refresh token may indicate reuse.
             * Revoke the stored session.
             */
            user.refreshToken = "";
            user.lastActivityAt = 0;

            await user.save();
            clearAuthCookies(res);

            return res.status(401).json({
                message: "Invalid session"
            });
        }

        if (isSessionIdleExpired(user.lastActivityAt)) {
            user.refreshToken = "";
            user.lastActivityAt = 0;

            await user.save();
            clearAuthCookies(res);

            return res.status(401).json({
                message: IDLE_LOGOUT_MESSAGE,
                idleLogout: true
            });
        }

        /*
         * Rotate both tokens.
         */
        const newAccessToken = createAccessToken(user._id);
        const newRefreshToken = createRefreshToken(user._id);

        user.refreshToken = hashToken(newRefreshToken);
        user.lastActivityAt = Date.now();

        await user.save();

        setAccessTokenCookie(res, newAccessToken);
        setRefreshTokenCookie(res, newRefreshToken);

        /*
         * The access token does not need to be returned in the body
         * because it is already stored in an HttpOnly cookie.
         */
        return res.status(200).json({
            message: "Session refreshed"
        });
    } catch (error) {
        clearAuthCookies(res);

        if (
            error.name === "TokenExpiredError" ||
            error.name === "JsonWebTokenError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired session"
            });
        }

        console.error("Refresh token error:", error);

        return res.status(500).json({
            message: "Unable to refresh session"
        });
    }
};


//check duplicates function
const checkDups = async (req, res) => {
    const { username, email, phone } = req.body
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

        if (phone) {
            const cleanedPhoneNum = phone.replace(/\D/g, ''); //removed spaces

            const phoneExists = await UserModel.findOne({ phone: cleanedPhoneNum })
            if (phoneExists) {
                return res.status(409).json({ message: "Phone number already registered" })
            }
        }
        res.status(200).json({ message: "Available" })
    } catch (e) {
        res.status(500).json({ message: "CheckDups Function failed " + e.message })
    }
}


//logout function
// const logoutUser = async (req, res) => {

//     try {
//         const { refreshToken } = req.cookies;

//         if (!refreshToken) {
//             res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' })
//             res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' })
//             return res.status(200).json({ message: "Logged Out" })
//         }

//         const user = await UserModel.findOne({ refreshToken })
//         if (user) {
//             user.refreshToken = ''
//             user.lastActivityAt = 0
//             await user.save()
//         }

//         clearAuthCookies(res)
//         res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' })


//         // Determine action based on the user found (if any)
//         const actionName = user.role === 'Admin' ? "ADMIN_LOGOUT" : user.role === 'Employee' ? "EMPLOYEE_LOGOUT" : "CUSTOMER_LOGOUT";
//         await logAction(actionName, user._id, { Username: user.username });

//         res.status(200).json({ message: "Logged Out" })
//     }

//     catch (e) {
//         res.status(500).json({ message: "Logout Function failed " + e.message })
//     }
// }


const logoutUser = async (req, res) => {
    try {
        const receivedRefreshToken =
            req.cookies?.refreshToken;

        let user = null;

        if (receivedRefreshToken) {
            const tokenHash =
                hashToken(receivedRefreshToken);

            user = await UserModel.findOne({
                refreshToken: tokenHash
            });

            if (user) {
                user.refreshToken = "";
                user.lastActivityAt = 0;

                await user.save();
            }
        }

        clearAuthCookies(res);

        /*
         * Clear any old cookie that may remain from the
         * previous authentication implementation.
         */
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        if (user) {
            const actionName =
                user.role === "Admin"
                    ? "ADMIN_LOGOUT"
                    : user.role === "Employee"
                        ? "EMPLOYEE_LOGOUT"
                        : "CUSTOMER_LOGOUT";

            await logAction(
                actionName,
                user._id,
                {
                    Username: user.username
                }
            );
        }

        return res.status(200).json({
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout error:", error);

        /*
         * Clear browser cookies even if database cleanup fails.
         */
        clearAuthCookies(res);

        return res.status(200).json({
            message: "Logged out successfully"
        });
    }
};


//send verification OTP function
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
            subject: 'M&RC Travel and Tours - Login OTP',
            html: buildBrandedEmail({
                title: 'Login OTP',
                introHtml: 'Use the OTP below to complete your login.',
                bodyHtml: `
                    <div style="margin:8px 0 14px; font-size:32px; font-weight:700; letter-spacing:8px; color:#992A46; background:#f8fafc; padding:14px 16px; border-radius:10px; border:1px dashed #cbd5e1; text-align:center;">${otp}</div>
                    <p style="margin:0 0 10px;">This OTP will expire in <strong>1 minute</strong>.</p>
                    <p style="margin:0; font-size:13px; color:#64748b;">If you did not try to log in, please ignore this email.</p>
                `,
            })
        }
        await transporter.sendMail(mailOptions)

        res.status(200).json({ message: "OTP has been sent successfully!" })
    } catch (e) {
        res.status(500).json({ message: "Send OTP function failed " + e.message })
    }
}


//verify email function
// const verifyEmail = async (req, res) => {
//     const { email, token } = req.body

//     try {
//         const user = await UserModel.findOne({ email })
//         if (!user) {
//             return res.status(409).json({ message: "User not found" })
//         }

//         if (token) {
//             if (user.emailVerifyExpireAt < Date.now()) {
//                 return res.status(409).json({ message: "Verification link expired" })
//             }
//             const matchToken = await bcrypt.compare(token, user.emailVerifyOtp)
//             if (!matchToken) {
//                 return res.status(409).json({ message: "Invalid verification link" })
//             }
//         }

//         user.emailVerifyOtp = ''
//         user.emailVerifyExpireAt = 0
//         user.isAccountVerified = true
//         await user.save();

//         return res.status(200).json({
//             message: "Account verified",
//             user: {
//                 username: user.username,
//                 firstName: user.firstname,
//                 lastName: user.lastname,
//                 role: user.role,
//                 profileImage: user.profileImage,
//                 loginOnce: user.loginOnce
//             }
//         });
//     } catch (e) {
//         res.status(500).json({ message: "Verify Email Function failed " + e.message })
//     }
// }


const verifyEmail = async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const token =
        typeof req.body.token === "string"
            ? req.body.token.trim()
            : "";

    if (!email || !token) {
        return res.status(400).json({
            message: "Email and verification token are required"
        });
    }

    try {
        const user = await UserModel.findOne({ email });

        /*
         * Use a generic message so this endpoint does not confirm
         * whether the email exists.
         */
        if (
            !user ||
            !user.emailVerifyOtp ||
            !user.emailVerifyExpireAt
        ) {
            return res.status(400).json({
                message: "Invalid or expired verification link"
            });
        }

        if (user.isAccountVerified) {
            return res.status(200).json({
                message: "Account is already verified"
            });
        }

        if (user.emailVerifyExpireAt < Date.now()) {
            user.emailVerifyOtp = "";
            user.emailVerifyExpireAt = 0;
            await user.save();

            return res.status(400).json({
                message: "Invalid or expired verification link"
            });
        }

        const submittedTokenHash = hashToken(token);

        const storedBuffer = Buffer.from(
            user.emailVerifyOtp,
            "hex"
        );

        const submittedBuffer = Buffer.from(
            submittedTokenHash,
            "hex"
        );

        const tokenMatches =
            storedBuffer.length === submittedBuffer.length &&
            crypto.timingSafeEqual(
                storedBuffer,
                submittedBuffer
            );

        if (!tokenMatches) {
            return res.status(400).json({
                message: "Invalid or expired verification link"
            });
        }

        user.emailVerifyOtp = "";
        user.emailVerifyExpireAt = 0;
        user.isAccountVerified = true;

        await user.save();

        return res.status(200).json({
            message: "Account verified successfully"
        });
    } catch (error) {
        console.error("Verify email error:", error);

        return res.status(500).json({
            message: "Unable to verify account"
        });
    }
};


// check if user is authenticated function
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
                firstName: currentUser.firstname,
                lastName: currentUser.lastname,
                profileImage: currentUser.profileImage,
                role: currentUser.role,
                loginOnce: currentUser.loginOnce
            }
        })
    } catch (e) {
        res.status(500).json({ message: "is Authenticated Function failed " + e.message })
    }
}


// check if user is verified function
const isUserVerified = async (req, res) => {
    try {
        return res.status(200).json({ message: "User is Verified" })
    } catch (e) {
        res.status(500).json({ message: "is User Verified Function failed " + e.message })
    }
}


//send reset OTP function
// const sendResetOtp = async (req, res) => {
//     const { email } = req.body

//     if (!email) {
//         return res.status(409).json({ message: "Email is required" })
//     }

//     try {
//         const user = await UserModel.findOne({ email })
//         if (!user) {
//             return res.status(409).json({ message: "Email is not registered" })
//         }

//         const otp = String(Math.floor(100000 + Math.random() * 900000)) //generate six digit random number
//         const hashedOtp = await bcrypt.hash(otp, 10)
//         user.resetOtp = hashedOtp;
//         user.resetOtpExpireAt = Date.now() + 60 * 1000

//         await user.save()

//         const mailOptions = {
//             from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
//             to: user.email,
//             subject: 'M&RC Travel and Tours - Password Reset OTP',
//             html: buildBrandedEmail({
//                 title: 'Password Reset OTP',
//                 introHtml: 'Reset your password using the OTP below.',
//                 bodyHtml: `
//                     <div style="margin:8px 0 14px; font-size:32px; font-weight:700; letter-spacing:8px; color:#992A46; background:#f8fafc; padding:14px 16px; border-radius:10px; border:1px dashed #cbd5e1; text-align:center;">${otp}</div>
//                     <p style="margin:0 0 10px;">This OTP will expire in <strong>1 minute</strong>.</p>
//                     <p style="margin:0; font-size:13px; color:#64748b;">If you did not request this password reset, please ignore this email.</p>
//                 `,
//             })
//         }

//         await transporter.sendMail(mailOptions)

//         return res.status(200).json({ message: "OTP sent to your email" })
//     } catch (e) {
//         res.status(500).json({ message: "Reset OTP Function failed: " + e.message })
//     }
// }


const sendResetOtp = async (req, res) => {
    const email = normalizeEmail(req.body.email);

    if (!email) {
        return res.status(400).json({
            message: "Email is required"
        });
    }

    const genericResponse = {
        message: "If an account exists for this email, a password reset OTP has been sent."
    };

    try {
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(200).json(genericResponse);
        }

        const otp = createOtp();
        const hashedOtp = await bcrypt.hash(otp, 10);

        user.resetOtp = hashedOtp;
        user.resetOtpExpireAt = Date.now() + 70 * 1000;
        user.resetOtpAttempts = 0;
        user.resetOtpBlockedUntil = 0;

        await user.save();

        const mailOptions = {
            from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
            to: user.email,
            subject: "M&RC Travel and Tours - Password Reset OTP",
            html: buildBrandedEmail({
                title: "Password Reset OTP",
                introHtml: "Reset your password using the OTP below.",
                bodyHtml: `
                    <div style="margin:8px 0 14px; font-size:32px; font-weight:700; letter-spacing:8px; color:#992A46; background:#f8fafc; padding:14px 16px; border-radius:10px; border:1px dashed #cbd5e1; text-align:center;">
                        ${otp}
                    </div>

                    <p style="margin:0 0 10px;">
                        This OTP will expire in <strong>1 minute</strong>.
                    </p>

                    <p style="margin:0; font-size:13px; color:#64748b;">
                        If you did not request this password reset, ignore this email.
                    </p>
                `
            })
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error("Send reset OTP error:", error);

        /*
         * Keep the outward response generic.
         */
        return res.status(200).json(genericResponse);
    }
};


// check reset OTP function
const checkResetOtp = async (req, res) => {
    const { email, otp } = req.body

    const user = await UserModel.findOne({ email })
    if (!user) {
        return res.status(409).json({ message: "Email is not registered" })
    }

    if (
        user.resetOtpBlockedUntil &&
        user.resetOtpBlockedUntil > Date.now()
    ) {
        return res.status(429).json({
            message: "Too many OTP attempts. Please try again in 5 minutes."
        });
    }

    if (user.resetOtpExpireAt < Date.now()) {
        return res.status(409).json({ message: "OTP expired" })
    }

    const isValidOtp = await bcrypt.compare(otp, user.resetOtp)

    if (!isValidOtp) {

        user.resetOtpAttempts =
            (user.resetOtpAttempts || 0) + 1;

        if (user.resetOtpAttempts >= 3) {
            user.resetOtpBlockedUntil =
                Date.now() + 5 * 60 * 1000;

            user.resetOtpAttempts = 0;
        }

        await user.save();

        return res.status(409).json({
            message: "Invalid OTP"
        });
    }

    user.resetOtpAttempts = 0;
    user.resetOtpBlockedUntil = 0;

    const resetToken = jwt.sign({ id: user._id, scope: "password-reset" }, process.env.JWT_SECRET_RESET_KEY, { expiresIn: '5m' })

    user.resetOtp = ''
    user.resetOtpExpireAt = ''

    await user.save()

    return res.status(200).json({ message: "You can now reset your password", resetToken })
}


//password reset function
// const resetPassword = async (req, res) => {
//     const { newPassword, token } = req.body

//     if (!token || !newPassword) {
//         return res.status(401).json({ message: "Token and new password is required" })
//     }

//     try {
//         let payload
//         try {
//             payload = jwt.verify(token, process.env.JWT_SECRET_RESET_KEY)
//         } catch (err) {
//             return res.status(401).json({ message: "Invalid or expired token" })
//         }

//         const user = await UserModel.findById(payload.id)
//         if (!user) {
//             return res.status(409).json({ message: "User not found" })
//         }

//         const hashedPassword = await bcrypt.hash(newPassword, 10)

//         user.hashedPassword = hashedPassword
//         user.resetOtp = ''
//         user.resetOtpExpireAt = 0
//         // mark account as verified when password is set via reset link
//         user.isAccountVerified = true

//         await user.save()

//         await logAction("PASSWORD_CHANGE", user._id, { Username: user.username });

//         return res.status(200).json({ message: "Password has been reset successfully" })

//     } catch (e) {
//         res.status(500).json({ message: "Reset Password Function failed " + e.message })
//     }

// }


const resetPassword = async (req, res) => {
    const token =
        typeof req.body.token === "string"
            ? req.body.token.trim()
            : "";

    const newPassword =
        typeof req.body.newPassword === "string"
            ? req.body.newPassword
            : "";

    if (!token || !newPassword) {
        return res.status(400).json({
            message: "Reset token and new password are required"
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({
            message: "Password must contain at least 8 characters"
        });
    }

    try {
        let payload;

        try {
            payload = jwt.verify(
                token,
                process.env.JWT_SECRET_RESET_KEY
            );
        } catch {
            return res.status(401).json({
                message: "Invalid or expired reset token"
            });
        }

        if (
            payload.scope !== "password-reset" ||
            !payload.id
        ) {
            return res.status(401).json({
                message: "Invalid or expired reset token"
            });
        }

        const user = await UserModel.findById(payload.id);

        if (!user) {
            return res.status(401).json({
                message: "Invalid or expired reset token"
            });
        }

        /*
         * Optional password-history check.
         */
        const sameAsCurrentPassword = await bcrypt.compare(
            newPassword,
            user.hashedPassword
        );

        if (sameAsCurrentPassword) {
            return res.status(400).json({
                message: "New password must be different from the current password"
            });
        }

        user.hashedPassword = await bcrypt.hash(
            newPassword,
            12
        );

        user.resetOtp = "";
        user.resetOtpExpireAt = 0;
        user.resetOtpAttempts = 0;
        user.resetOtpBlockedUntil = null;

        /*
         * Revoke active sessions after password reset.
         */
        user.refreshToken = "";
        user.lastActivityAt = 0;

        /*
         * Do not automatically verify the email here.
         */
        await user.save();

        clearAuthCookies(res);

        await logAction(
            "PASSWORD_CHANGE",
            user._id,
            {
                Username: user.username
            }
        );

        return res.status(200).json({
            message: "Password has been reset successfully"
        });
    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Unable to reset password"
        });
    }
};


export {
    loginUser,
    allowLogin,
    signupUser,
    checkDups,
    logoutUser,
    sendVerifyOtp,
    verifyEmail,
    isAuthenticated,
    sendResetOtp,
    resetPassword,
    checkResetOtp,
    isUserVerified,
    refreshToken
};
