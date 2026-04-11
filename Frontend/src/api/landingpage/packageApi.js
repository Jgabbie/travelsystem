import axiosInstance from '../../config/axiosConfig';

export const fetchPopularPackages = (limit = 3) =>
    axiosInstance.get('/package/popular-packages', { params: { limit } });

export const fetchAllPackages = () =>
    axiosInstance.get('/package/get-packages');
