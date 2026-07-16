import apiFetch from "../config/fetchConfig";
import { useAuth } from "./useAuth";

let refreshRequest = null;

const requestSessionRefresh = () => {
    if (!refreshRequest) {
        refreshRequest = apiFetch
            .post("/auth/refresh-token", {})
            .finally(() => {
                refreshRequest = null;
            });
    }

    return refreshRequest;
};

const useRefreshToken = () => {
    const { checkAuth } = useAuth();

    const refresh = async () => {
        const response = await requestSessionRefresh();

        /*
         * Reload the authenticated user's information after
         * the HttpOnly access-token cookie has been renewed.
         */
        await checkAuth();

        return response;
    };

    return refresh;
};

export default useRefreshToken;