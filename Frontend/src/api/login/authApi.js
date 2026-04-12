import apiFetch from "../../config/fetchConfig";

export const loginUser = (data) => { //data comes from authService in loginUser(values)
    return apiFetch('/auth/loginUser', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

export const sendVerifyOTP = (email) => {
    return apiFetch('/auth/send-verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
};

export const verifyAccount = (data) => {
    return apiFetch('/auth/verify-account', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};