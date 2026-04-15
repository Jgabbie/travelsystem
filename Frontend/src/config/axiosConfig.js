import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const PROD_BASE_URL = 'https://api.mrctravelandtours.com/api';

const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BASE_URL = isLocalhost ? API_BASE_URL : PROD_BASE_URL;

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // Required for cookies/sessions
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosInstance;