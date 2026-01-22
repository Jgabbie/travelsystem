const jwt = require("jsonwebtoken")
const User = require('../models/user')

//This checks if user is verified
const userVerify = async (req, res, next) => {
    const { token } = req.cookies
    if (!token) {
        return res.status(401).json({ message: "Not Authorized. Login Again" })
    }
    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(tokenDecode.id) //get userid

        if (!user.isAccountVerified) { //check if user is verified
            return res.status(403).json({
                message: "Please verify email"
            })
        }
        next()

    } catch (e) {
        console.log(process.env.JWT_SECRET)
        res.status(500).json({ message: "User Verify Function failed " + e.message })
    }
}

module.exports = userVerify