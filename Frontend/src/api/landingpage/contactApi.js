import axiosInstance from '../../config/axiosConfig';

export const sendContact = (data) =>
    axiosInstance.post('/email/contact', data);