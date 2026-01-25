const jwt = require("jsonwebtoken")
const User = require("../models/user")

//This gatekeeps the cookie, and checks if the cookie is real.
const userAuth = async (req, res, next) => {
    const { token } = req.cookies

    if (!token) {
        return res.status(401).json({ message: "Not Authorized. Login Again" })
    }

    try {
        //once the verification of the cookie is done, it will unlock the data inside which is the "userId"

        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET)

        console.log("TOKEN: " + token)
        console.log("SECRET: " + process.env.JWT_SECRET)

        // const user = await User.findById(tokenDecode.id) //get userid

        // if (!user.isAccountVerified) { //check if user is verified
        //     return res.status(403).json({
        //         message: "Please verify email"
        //     })
        // }

        if (tokenDecode.id) {
            req.userId = tokenDecode.id // passing the info to know who is the "userId"
        } else {
            return res.json({ message: "Not Authorized. Login Again" })
        }

        next()

    } catch (e) {
        console.log(process.env.JWT_SECRET)
        res.status(500).json({ message: "User Auth Function failed " + e.message })
    }
}

module.exports = userAuth