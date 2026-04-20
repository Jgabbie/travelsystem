const UserModel = require('../models/user');
const ArchivedUserModel = require('../models/archivedusers');
const bcrypt = require("bcryptjs");
const logAction = require('../utils/logger');
const transporter = require('../config/nodemailer')

const getUserData = async (req, res) => {
    try {
        const { userId } = req
        const user = await UserModel.findById(userId)

        if (!user) {
            return res.status(409).json({ message: "User not found: " + req.body })
        }

        res.json({
            success: true,
            userData: {
                _id: user._id,
                username: user.username,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                phone: user.phone,
                profileImage: user.profileImage,
                homeAddress: user.homeAddress || '',
                gender: user.gender || '',
                birthdate: user.birthdate || '',
                nationality: user.nationality || '',
                role: user.role,
                isAccountVerified: user.isAccountVerified
            }
        })

    } catch (e) {
        res.status(500).json({ message: "Get User Data Function failed: " + e.message })
    }
}

const updateUserData = async (req, res) => {
    try {
        const { userId } = req
        const {
            firstname,
            lastname,
            email,
            phone,
            profileImage,
            homeAddress,
            gender,
            birthdate,
            nationality
        } = req.body

        if (!firstname || !lastname || !email || !phone) {
            return res.status(400).json({ message: "All fields are required" })
        }

        const user = await UserModel.findById(userId)

        if (!user) {
            return res.status(409).json({ message: "User not found" })
        }

        // Check if email is already taken by another user
        if (email !== user.email) {
            const existingUser = await UserModel.findOne({ email })
            if (existingUser) {
                return res.status(400).json({ message: "Email already in use" })
            }
        }

        const updatedFields = {}
        const changes = []

        if (user.firstname !== firstname) {
            updatedFields.firstname = { from: user.firstname, to: firstname }
            changes.push('firstname')
        }
        if (user.lastname !== lastname) {
            updatedFields.lastname = { from: user.lastname, to: lastname }
            changes.push('lastname')
        }
        if (user.email !== email) {
            updatedFields.email = { from: user.email, to: email }
            changes.push('email')
        }
        if (user.phone !== phone) {
            updatedFields.phone = { from: user.phone, to: phone }
            changes.push('phone')
        }
        if (typeof profileImage === 'string' && user.profileImage !== profileImage) {
            updatedFields.profileImage = { from: Boolean(user.profileImage), to: Boolean(profileImage) }
            changes.push('profileImage')
        }
        if (typeof homeAddress === 'string' && user.homeAddress !== homeAddress) {
            updatedFields.homeAddress = { from: user.homeAddress, to: homeAddress }
            changes.push('homeAddress')
        }
        if (typeof gender === 'string' && user.gender !== gender) {
            updatedFields.gender = { from: user.gender, to: gender }
            changes.push('gender')
        }
        if (typeof birthdate === 'string' && user.birthdate !== birthdate) {
            updatedFields.birthdate = { from: user.birthdate, to: birthdate }
            changes.push('birthdate')
        }
        if (typeof nationality === 'string' && user.nationality !== nationality) {
            updatedFields.nationality = { from: user.nationality, to: nationality }
            changes.push('nationality')
        }

        user.firstname = firstname
        user.lastname = lastname
        user.email = email
        user.phone = phone
        if (typeof profileImage === 'string') {
            user.profileImage = profileImage
        }
        if (typeof homeAddress === 'string') {
            user.homeAddress = homeAddress
        }
        if (typeof gender === 'string') {
            user.gender = gender
        }
        if (typeof birthdate === 'string') {
            user.birthdate = birthdate
        }
        if (typeof nationality === 'string') {
            user.nationality = nationality
        }

        await user.save()

        if (changes.length > 0) {
            await logAction(
                'USER_PROFILE_UPDATED',
                userId,
                {
                    "Profile Updated": `Role: ${user.role} | Username: ${user.username} | Email: ${user.email}`,


                }
            )
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            userData: {
                _id: user._id,
                username: user.username,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                phone: user.phone,
                profileImage: user.profileImage,
                homeAddress: user.homeAddress || '',
                gender: user.gender || '',
                birthdate: user.birthdate || '',
                nationality: user.nationality || '',
                role: user.role,
                isAccountVerified: user.isAccountVerified
            }
        })

    } catch (e) {
        res.status(500).json({ message: "Update User Data Function failed: " + e.message })
    }
}

const getUsers = (req, res) => {
    UserModel.find()
        .then(users => res.json(users))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.message })
        });
};

const getArchivedUsers = (req, res) => {
    ArchivedUserModel.find()
        .sort({ archivedAt: -1 })
        .then(users => res.json(users))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.message })
        });
};


const createUsers = async (req, res) => {
    const { username, firstname, lastname, password, email, phone, role } = req.body;

    const adminId = req.userId;

    if (!adminId) {
        return res.status(401).json({ message: "Unauthorized: Admin ID missing" });
    }

    try {
        const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists" });
        }

        if (role === "Admin" || role === "Employee") {
            const randomPassword = Math.random().toString(36).slice(-8);

            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            const newUser = await UserModel.create({
                username,
                firstname,
                lastname,
                email,
                phone,
                hashedPassword,
                role,
                isAccountVerified: true
            });

            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: email,
                subject: `Your ${role} Account Has Been Created`,
                html: `
            <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
                <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">

                <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                <h2 style="color:#305797; margin-bottom:10px;">
                    Welcome to M&RC Travel and Tours
                </h2>

                <p style="color:#555; font-size:16px;">
                    Hello <b>${username}</b>,
                </p>

                <p style="color:#555; font-size:15px; line-height:1.6;">
                    Your account has been successfully created!
                </p>

                <p style="color:#555; font-size:15px; line-height:1.6;">
                    Here is your password. Kindly log in to your account immediately and reset your password.
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
                        ${randomPassword}
                    </div>

                <a href="http://mrctravelntours.vercel.app/home"
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
                    Log In to Your Account
                </a>

                <p style="color:#777; font-size:13px; margin-top:30px;">
                    If you did not request this account, please ignore this email.
                </p>

                <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                    <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                    <p>M&RC Travel and Tours</p>
                    <p>support@mrctravelandtours.com</p>
                    <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                </div>
            </div>`
            });

            const actionName = role === "Admin" ? "ADMIN_CREATED_ADMIN" : "ADMIN_CREATED_USER";

            await logAction(
                actionName,
                adminId,
                {
                    "Successfully Created": `Role: ${newUser.role} | Username: ${newUser.username} | Email: ${newUser.email}`
                });

            const io = req.app.get('io')
            if (io) {
                io.emit('user:created', {
                    id: newUser._id,
                    createdAt: newUser.createdAt
                })
            }

        }

        if (role === "Customer") {
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = await UserModel.create({
                username,
                firstname,
                lastname,
                email,
                phone,
                hashedPassword,
                role: role || "Customer",
                isAccountVerified: true
            });

            const actionName = role === "Admin" ? "ADMIN_CREATED_ADMIN" : "ADMIN_CREATED_USER";

            await logAction(
                actionName,
                adminId,
                {
                    "Successfully Created": `Role: ${newUser.role} | Username: ${newUser.username} | Email: ${newUser.email}`
                });


            const io = req.app.get('io')
            if (io) {
                io.emit('user:created', {
                    id: newUser._id,
                    createdAt: newUser.createdAt
                })
            }
        }





        res.status(201).json({ message: "User created successfully", user: newUser });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const markLoginOnce = async (req, res) => {
    try {
        const { userId } = req
        const user = await UserModel.findById(userId)

        if (!user) {
            return res.status(409).json({ message: "User not found" })
        }

        if (!user.loginOnce) {
            user.loginOnce = true
            await user.save()
        }

        res.json({ success: true, loginOnce: user.loginOnce })
    } catch (e) {
        res.status(500).json({ message: "Mark login once failed: " + e.message })
    }
}

const delUsers = async (req, res) => {
    const { id } = req.params;
    const adminId = req.userId;

    if (!adminId) {
        return res.status(401).json({ message: "Unauthorized: Admin ID missing" });
    }

    if (!id) {
        return res.status(400).json({ message: "User id is required" });
    }

    try {
        const user = await UserModel.findById(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await ArchivedUserModel.create({
            originalUserId: user._id,
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            hashedPassword: user.hashedPassword,
            phone: user.phone,
            profileImage: user.profileImage,
            role: user.role,
            isAccountVerified: user.isAccountVerified
        });

        await UserModel.findByIdAndDelete(id);

        await logAction(
            "ADMIN_DELETED_USER",
            adminId,
            {
                "Successfully Deleted": `Role: ${user.role} | Username: ${user.username} | Email: ${user.email}`
            });

        res.json({ message: "User archived and deleted", userId: user._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const restoreArchivedUser = async (req, res) => {
    const { id } = req.params;
    const adminId = req.userId;

    if (!adminId) {
        return res.status(401).json({ message: "Unauthorized: Admin ID missing" });
    }

    try {
        const archivedUser = await ArchivedUserModel.findById(id);
        if (!archivedUser) {
            return res.status(404).json({ message: "Archived user not found" });
        }

        const existingUser = await UserModel.findOne({
            $or: [{ email: archivedUser.email }, { username: archivedUser.username }]
        });

        if (existingUser) {
            return res.status(409).json({ message: "User with this email or username already exists" });
        }

        const restoredUser = await UserModel.create({
            _id: archivedUser.originalUserId,
            username: archivedUser.username,
            firstname: archivedUser.firstname,
            lastname: archivedUser.lastname,
            email: archivedUser.email,
            hashedPassword: archivedUser.hashedPassword,
            phone: archivedUser.phone,
            profileImage: archivedUser.profileImage,
            role: archivedUser.role,
            isAccountVerified: archivedUser.isAccountVerified
        });

        await ArchivedUserModel.findByIdAndDelete(id);

        await logAction(
            "ADMIN_RESTORED_USER",
            adminId,
            {
                "User Restored": `Role: ${restoredUser.role} | Username: ${restoredUser.username} | Email: ${restoredUser.email}`
            }
        );

        res.json({ message: "User restored successfully", user: restoredUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getUsers, getArchivedUsers, createUsers, delUsers, restoreArchivedUser, getUserData, updateUserData, markLoginOnce };