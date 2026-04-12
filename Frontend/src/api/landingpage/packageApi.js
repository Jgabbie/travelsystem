import apiFetch from "../../config/fetchConfig";

export const fetchPopularPackages = (limit = 3) =>
    apiFetch('/package/popular-packages', { params: { limit } });

export const fetchAllPackages = () =>
    apiFetch('/package/get-packages');
