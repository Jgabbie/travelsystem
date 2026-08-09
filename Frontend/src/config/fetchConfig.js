const API_BASE_URL = 'http://localhost:8000/api';
const PROD_BASE_URL = 'https://api.mrctravelandtours.com/api';

const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BASE_URL = isLocalhost ? API_BASE_URL : PROD_BASE_URL;



const apiFetch = async (endpoint, options = {}) => {
    const {
        params,
        withCredentials,
        timeout = 30000,
        ...rest
    } = options;

    const url = new URL(`${BASE_URL}${endpoint}`);

    if (params && typeof params === 'object') {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });
    }

    const isFormData =
        typeof FormData !== 'undefined' &&
        rest.body instanceof FormData;

    const headers = {
        ...rest.headers,
    };

    if (isFormData) {
        delete headers['Content-Type'];
    } else if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);

    const defaultOptions = {
        credentials: 'include',
        ...rest,
        headers,
        signal: controller.signal,
    };

    let response;

    try {
        response = await fetch(url.toString(), defaultOptions);
    } catch (error) {
        clearTimeout(timeoutId);

        const isTimeout =
            error?.name === 'AbortError';

        throw {
            status: 0,
            data: {},
            message: isTimeout
                ? 'Request timed out. Please check your internet connection.'
                : 'Network error. Please check your internet connection.',
            isNetworkError: true,
            isTimeout,
            originalError: error,
        };
    }

    clearTimeout(timeoutId);

    // Fetch doesn't throw on 4xx/5xx errors,
    // so handle them manually.
    if (!response.ok) {
        const errorData =
            await response.json().catch(() => ({}));

        if (
            errorData?.idleLogout &&
            typeof window !== 'undefined'
        ) {
            window.dispatchEvent(
                new CustomEvent('auth:idle-logout', {
                    detail: {
                        message:
                            errorData?.message ||
                            'You have been logged out by the system for idling',
                    },
                })
            );
        }

        throw {
            status: response.status,
            data: errorData,
            message: `HTTP error! status: ${response.status}`,
            isNetworkError: false,
        };
    }

    return response.json();
};







// const apiFetch = async (endpoint, options = {}) => {
//     const { params, withCredentials, ...rest } = options;
//     const url = new URL(`${BASE_URL}${endpoint}`);

//     if (params && typeof params === 'object') {
//         Object.entries(params).forEach(([key, value]) => {
//             if (value !== undefined && value !== null) {
//                 url.searchParams.append(key, value);
//             }
//         });
//     }

//     const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
//     const headers = {
//         ...rest.headers,
//     };

//     if (isFormData) {
//         delete headers['Content-Type'];
//     } else if (!headers['Content-Type']) {
//         headers['Content-Type'] = 'application/json';
//     }

//     const defaultOptions = {
//         credentials: 'include',
//         ...rest,
//         headers,
//     };

//     const response = await fetch(url.toString(), defaultOptions);

//     if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));

//         if (errorData?.idleLogout && typeof window !== 'undefined') {
//             window.dispatchEvent(new CustomEvent('auth:idle-logout', {
//                 detail: {
//                     message: errorData?.message || 'You have been logged out by the system for idling'
//                 }
//             }));
//         }

//         throw {
//             status: response.status,
//             data: errorData,
//             message: `HTTP error! status: ${response.status}`
//         };
//     }

//     return response.json();
// };


//get
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