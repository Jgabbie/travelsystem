import axios from 'axios';
const API_BASE_URL = 'http://localhost:8000/api';
const VERCEL_BASE_URL = 'https://mrctravelntoursapi.vercel.app/api';
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const BASE_URL = isLocalhost ? API_BASE_URL : VERCEL_BASE_URL;

//creates an instance that can be used throughout the system when send a request to the backend, basically just shortens the call syntax
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 8000,
});



export default axiosInstance;