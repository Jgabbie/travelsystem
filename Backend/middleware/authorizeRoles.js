import UserModel from "../models/user.js";

const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.userId) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            // Get the role from the database instead of trusting
            // a role supplied by the frontend.
            const authenticatedUser = await UserModel.findById(req.userId)
                .select("_id role isActive")
                .lean();

            if (!authenticatedUser) {
                return res.status(401).json({
                    message: "Authenticated user no longer exists"
                });
            }

            if (authenticatedUser.isActive === false) {
                return res.status(403).json({
                    message: "Your account has been disabled"
                });
            }

            if (!allowedRoles.includes(authenticatedUser.role)) {
                return res.status(403).json({
                    message: "You are not authorized to access this resource"
                });
            }

            req.authUser = authenticatedUser;
            next();
        } catch (error) {
            console.error("Role authorization error:", error);

            return res.status(500).json({
                message: "Unable to authorize request"
            });
        }
    };
};

export default authorizeRoles;