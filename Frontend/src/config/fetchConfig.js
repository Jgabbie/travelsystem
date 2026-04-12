const API_BASE_URL = 'http://localhost:8000/api';
const PROD_BASE_URL = 'https://mrctraveltours-qa72u.ondigitalocean.app/api';

const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BASE_URL = isLocalhost ? API_BASE_URL : PROD_BASE_URL;

/**
 * Custom fetch wrapper to mimic axiosInstance behavior
 */
const apiFetch = async (endpoint, options = {}) => {
    const { params, withCredentials, ...rest } = options;
    const url = new URL(`${BASE_URL}${endpoint}`);

    if (params && typeof params === 'object') {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });
    }

    const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
    const headers = {
        ...rest.headers,
    };

    if (isFormData) {
        delete headers['Content-Type'];
    } else if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const defaultOptions = {
        // Equivalent to withCredentials: true
        credentials: 'include',
        ...rest,
        headers,
    };

    const response = await fetch(url.toString(), defaultOptions);

    // Fetch doesn't throw on 4xx/5xx errors, so we handle it manually
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
            status: response.status,
            data: errorData,
            message: `HTTP error! status: ${response.status}`
        };
    }

    return response.json();
};

apiFetch.get = (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' });

apiFetch.post = (endpoint, data, options = {}) => {
    const body = data instanceof FormData || typeof data === 'string' ? data : JSON.stringify(data ?? {});
    return apiFetch(endpoint, { ...options, method: 'POST', body });
};

apiFetch.put = (endpoint, data, options = {}) => {
    const body = data instanceof FormData || typeof data === 'string' ? data : JSON.stringify(data ?? {});
    return apiFetch(endpoint, { ...options, method: 'PUT', body });
};

apiFetch.patch = (endpoint, data, options = {}) => {
    const body = data instanceof FormData || typeof data === 'string' ? data : JSON.stringify(data ?? {});
    return apiFetch(endpoint, { ...options, method: 'PATCH', body });
};

apiFetch.delete = (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' });

export default apiFetch;