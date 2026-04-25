const SESSION_IDLE_TIMEOUT_MS = 6 * 60 * 60 * 1000;
const ACCESS_TOKEN_MAX_AGE = SESSION_IDLE_TIMEOUT_MS;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const IDLE_LOGOUT_MESSAGE = 'You have been logged out by the system for idling';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
};

const clearAuthCookies = (res) => {
    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
};

const setAccessTokenCookie = (res, accessToken) => {
    res.cookie('accessToken', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_MAX_AGE,
    });
};

const setRefreshTokenCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_MAX_AGE,
    });
};

const isSessionIdleExpired = (lastActivityAt) => {
    if (!lastActivityAt) return false;

    return Date.now() - Number(lastActivityAt) >= SESSION_IDLE_TIMEOUT_MS;
};

module.exports = {
    SESSION_IDLE_TIMEOUT_MS,
    IDLE_LOGOUT_MESSAGE,
    clearAuthCookies,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    isSessionIdleExpired,
};