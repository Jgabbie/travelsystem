const jwt = require("jsonwebtoken");

const optionalUserAuth = (req, res, next) => {
    const { accessToken } = req.cookies;

    if (!accessToken) {
        return next();
    }

    try {
        const tokenDecode = jwt.verify(
            accessToken,
            process.env.JWT_SECRET_ACCESS_KEY
        );

        if (tokenDecode.id) {
            req.userId = tokenDecode.id;
        }
    } catch (err) {
    }

    next();
};

module.exports = optionalUserAuth;