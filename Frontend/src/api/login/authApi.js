import axiosInstance from '../../config/axiosConfig';

export const loginUser = (data) => { //data comes from authService in loginUser(values)
    return axiosInstance.post('/auth/loginUser', data);
};

export const sendVerifyOTP = (email) => {
    return axiosInstance.post('/auth/send-verify-otp', { email });
};

export const verifyAccount = (data) => {
    return axiosInstance.post('/auth/verify-account', data, { withCredentials: true });
};