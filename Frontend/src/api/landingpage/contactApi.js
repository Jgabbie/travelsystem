import apiFetch from "../../config/axiosConfig";


export const sendContact = (data) =>
    apiFetch('/email/contact', {
        method: 'POST',
        body: JSON.stringify(data)
    });