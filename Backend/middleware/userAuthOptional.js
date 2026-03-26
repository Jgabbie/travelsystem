const jwt = require("jsonwebtoken")

const userAuthOptional = (req, res, next) => {
    const { accessToken } = req.cookies

    if (!accessToken) {
        return next()
    }

    try {
        const tokenDecode = jwt.verify(accessToken, process.env.JWT_SECRET_ACCESS_KEY)

        if (tokenDecode?.id) {
            req.userId = tokenDecode.id
        }

        return next()
    } catch (e) {
        return res.status(401).json({ message: "Not Authorized. Login Again" })
    }
}

module.exports = userAuthOptional
