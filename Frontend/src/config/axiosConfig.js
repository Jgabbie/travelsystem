import axios from 'axios';
const API_BASE_URL = 'http://localhost:8000/api';

//creates an instance that can be used throughout the system when send a request to the backend, basically just shortens the call syntax
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});





export default axiosInstance;