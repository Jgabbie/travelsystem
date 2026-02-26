import axiosInstance from "../config/axiosConfig";
import { useAuth } from "./useAuth";

const useRefreshToken = () => {
    const { setAuth } = useAuth();
    const refresh = async () => {
        const response = await axiosInstance.get('/auth/refresh', { withCredentials: true });
        setAuth(prev => {
            console.log("Prev auth:", prev);
            console.log("New access token:", response.data.accessToken);
            return { ...prev, accessToken: response.data.accessToken }
        });
        return response.data.accessToken;
    }
    return refresh;
}

export default useRefreshToken;