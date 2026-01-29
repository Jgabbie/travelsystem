import axios from 'axios';


const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

//creates an instance that can be used throughout the system when send a request to the backend, basically just shortens the call syntax
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.response.use(
    res => res,
    async error => {
        const originalRequest = error.config;

        // Prevent retry loop for /auth/is-auth or /auth/refresh-token
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/auth/is-auth') &&
            !originalRequest.url.includes('/auth/refresh-token')
        ) {
            originalRequest._retry = true;

            try {
                await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
                return axiosInstance(originalRequest);
            } catch {
                window.location.href = '/login'; // kick out if refresh fails
            }
        }

        return Promise.reject(error);
    }
);




export default axiosInstance;