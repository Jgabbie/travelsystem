import apiFetch from "../config/fetchConfig";
import { useAuth } from "./useAuth";

const useRefreshToken = () => {
    const { setAuth } = useAuth();
    const refresh = async () => {
        const response = await apiFetch.get('/auth/refresh', { withCredentials: true });
        setAuth(prev => {
            console.log("Prev auth:", prev);
            console.log("New access token:", response.accessToken);
            return { ...prev, accessToken: response.accessToken }
        });
        return response.accessToken;
    }
    return refresh;
}

export default useRefreshToken;