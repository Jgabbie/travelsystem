import crypto from "crypto";
import jwt from "jsonwebtoken"
import User from "../models/user.js"

import {
    clearAuthCookies,
    setAccessTokenCookie,
    IDLE_LOGOUT_MESSAGE,
    isSessionIdleExpired,
} from "../utils/sessionAuth.js"

const hashToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

const refreshTokenMatches = (rawToken, storedTokenHash) => {
    if (
        !rawToken ||
        !storedTokenHash ||
        !/^[a-f0-9]{64}$/i.test(storedTokenHash)
    ) {
        return false;
    }

    const receivedTokenHash = hashToken(rawToken);

    const storedBuffer = Buffer.from(storedTokenHash, "hex");
    const receivedBuffer = Buffer.from(receivedTokenHash, "hex");

    return (
        storedBuffer.length === receivedBuffer.length &&
        crypto.timingSafeEqual(storedBuffer, receivedBuffer)
    );
};

//This gatekeeps the cookie, and checks if the cookie is real.
const userAuth = async (req, res, next) => {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    const rejectSession = async ({
        userId = null,
        idleLogout = false,
    } = {}) => {
        if (userId) {
            try {
                await User.findByIdAndUpdate(userId, {
                    refreshToken: "",
                    lastActivityAt: 0,
                });
            } catch (error) {
                console.error(
                    "[Auth] Failed to revoke database session:",
                    error.message
                );
            }
        }

        clearAuthCookies(res);

        if (idleLogout) {
            return res.status(401).json({
                message: IDLE_LOGOUT_MESSAGE,
                idleLogout: true,
            });
        }

        return res.status(401).json({
            message: "Not Authorized. Login Again",
        });
    };



    const renewSessionFromRefreshToken = async () => {
        if (!refreshToken) {
            return {
                status: "missing",
            };
        }

        let decodedRefreshToken;

        try {
            decodedRefreshToken = jwt.verify(
                refreshToken,
                process.env.JWT_SECRET_REFRESH_KEY
            );
        } catch {
            return {
                status: "invalid",
            };
        }

        const user = await User.findById(decodedRefreshToken.id);

        if (!user) {
            return {
                status: "invalid",
            };
        }

        if (!refreshTokenMatches(refreshToken, user.refreshToken)) {
            return {
                status: "invalid",
                userId: user._id,
            };
        }

        if (isSessionIdleExpired(user.lastActivityAt)) {
            return {
                status: "idle",
                userId: user._id,
            };
        }

        const newAccessToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET_ACCESS_KEY,
            { expiresIn: "2h" }
        );

        setAccessTokenCookie(res, newAccessToken);

        user.lastActivityAt = Date.now();
        await user.save();

        req.userId = user._id.toString();

        return {
            status: "renewed",
        };
    };

    try {
        if (!accessToken && !refreshToken) {
            return rejectSession();
        }

        if (accessToken) {
            try {
                const decodedAccessToken = jwt.verify(
                    accessToken,
                    process.env.JWT_SECRET_ACCESS_KEY
                );

                const user = await User.findById(decodedAccessToken.id);

                if (!user) {
                    return rejectSession();
                }

                if (isSessionIdleExpired(user.lastActivityAt)) {
                    return rejectSession({
                        userId: user._id,
                        idleLogout: true,
                    });
                }

                req.userId = user._id.toString();

                user.lastActivityAt = Date.now();
                await user.save();

                return next();
            } catch (error) {
                /*
                 * The access token may be expired or invalid.
                 * Attempt renewal using the refresh token.
                 */
                const refreshResult =
                    await renewSessionFromRefreshToken();

                if (refreshResult.status === "renewed") {
                    return next();
                }

                if (refreshResult.status === "idle") {
                    return rejectSession({
                        userId: refreshResult.userId,
                        idleLogout: true,
                    });
                }

                return rejectSession({
                    userId: refreshResult.userId,
                });
            }
        }

        /*
         * The access-token cookie may already have expired,
         * but the refresh-token cookie can still restore it.
         */
        const refreshResult =
            await renewSessionFromRefreshToken();

        if (refreshResult.status === "renewed") {
            return next();
        }

        if (refreshResult.status === "idle") {
            return rejectSession({
                userId: refreshResult.userId,
                idleLogout: true,
            });
        }

        return rejectSession({
            userId: refreshResult.userId,
        });
    } catch (error) {
        console.error(
            "[Auth] Unexpected authentication error:",
            error
        );

        /*
         * Do not report database or temporary server failures
         * as an idle logout.
         */
        return res.status(500).json({
            message: "Unable to verify the current session",
        });
    }
}

export default userAuth