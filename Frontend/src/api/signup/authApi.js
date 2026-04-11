import axiosInstance from '../../config/axiosConfig';

export const signupUser = (data) => {
    return axiosInstance.post('/auth/signupUser', data);
};

export const checkDuplicates = (data) => {
    return axiosInstance.post('/auth/checkDups', data);
};