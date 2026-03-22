import { io } from "socket.io-client";

const LOCAL_URL = "http://localhost:8000";
const PROD_URL = "https://mrctravelntoursapi.vercel.app";
const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
const SOCKET_URL = isLocalhost ? LOCAL_URL : PROD_URL;

const socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: isLocalhost,
});

export const isSocketEnabled = isLocalhost;

export default socket;
