const jwt = require("jsonwebtoken")
const User = require("../models/user")
const {
    clearAuthCookies,
    setAccessTokenCookie,
    IDLE_LOGOUT_MESSAGE,
    isSessionIdleExpired,
} = require("../utils/sessionAuth")

//This gatekeeps the cookie, and checks if the cookie is real.
const userAuth = async (req, res, next) => {
    const { accessToken, refreshToken } = req.cookies

    if (!accessToken && !refreshToken) {
        return res.status(401).json({ message: "Not Authorized. Login Again" })
    }

    const rejectSession = async (userId) => {
        if (userId) {
            await User.findByIdAndUpdate(userId, {
                refreshToken: '',
                lastActivityAt: 0,
            })
        }

        clearAuthCookies(res)
        return res.status(401).json({ message: IDLE_LOGOUT_MESSAGE, idleLogout: true })
    }

    const renewSessionFromRefreshToken = async () => {
        if (!refreshToken) {
            return false
        }

        let decodedRefreshToken
        try {
            decodedRefreshToken = jwt.verify(refreshToken, process.env.JWT_SECRET_REFRESH_KEY)
        } catch (error) {
            return false
        }

        const user = await User.findById(decodedRefreshToken.id)
        if (!user || user.refreshToken !== refreshToken) {
            await rejectSession(user?._id)
            return true
        }

        if (isSessionIdleExpired(user.lastActivityAt)) {
            await rejectSession(user._id)
            return true
        }

        const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '2h' })
        setAccessTokenCookie(res, newAccessToken)

        user.lastActivityAt = Date.now()
        await user.save()

        req.userId = user._id
        return true
    }

    try {
        //once the verification of the cookie is done, it will unlock the data inside which is the "userId"

        if (accessToken) {
            try {
                const tokenDecode = jwt.verify(accessToken, process.env.JWT_SECRET_ACCESS_KEY)
                const user = await User.findById(tokenDecode.id)

                if (!user) {
                    return await rejectSession()
                }

                if (isSessionIdleExpired(user.lastActivityAt)) {
                    return await rejectSession(user._id)
                }

                req.userId = tokenDecode.id
                user.lastActivityAt = Date.now()
                await user.save()
                return next()
            } catch (error) {
                if (error.name === 'TokenExpiredError' || refreshToken) {
                    const renewed = await renewSessionFromRefreshToken()
                    if (renewed) {
                        return next()
                    }
                }

                return await rejectSession()
            }
        }

        const renewed = await renewSessionFromRefreshToken()
        if (renewed) {
            return next()
        }

        return res.status(401).json({ message: "Not Authorized. Login Again" })

    } catch (e) {
        return res.status(401).json({ message: "Not Authorized. Login Again" })
    }
}

module.exports = userAuth