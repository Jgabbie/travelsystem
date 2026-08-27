import { rateLimit } from "express-rate-limit";

const createLimiter = ({
    windowMs,
    limit,
    message
}) => {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            message
        }
    });
};

export const loginLimiter = createLimiter({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    message: "Too many login attempts. Please try again later."
});

export const otpRequestLimiter = createLimiter({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    message: "Too many OTP requests. Please try again later."
});

export const otpVerificationLimiter = createLimiter({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    message: "Too many verification attempts. Please try again later."
});

export const signupLimiter = createLimiter({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    message: "Too many signup attempts. Please try again later."
});

export const refreshLimiter = createLimiter({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    message: "Too many refresh attempts. Please try again shortly."
});