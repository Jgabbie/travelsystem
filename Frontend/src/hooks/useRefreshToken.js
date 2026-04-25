import apiFetch from "../config/fetchConfig";
import { useAuth } from "./useAuth";

const useRefreshToken = () => {
    const { setAuth } = useAuth();
    const refresh = async () => {
        const response = await apiFetch.get('/auth/refresh', { withCredentials: true });
        setAuth(prev => prev ? { ...prev, accessToken: response.accessToken } : prev);
        return response.accessToken;
    }
    return refresh;
}

export default useRefreshToken;