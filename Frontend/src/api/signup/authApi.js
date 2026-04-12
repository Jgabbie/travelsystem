import apiFetch from "../../config/fetchConfig";

export const signupUser = (data) => {
    return apiFetch('/auth/signupUser', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

export const checkDuplicates = (data) => {
    return apiFetch('/auth/checkDups', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};