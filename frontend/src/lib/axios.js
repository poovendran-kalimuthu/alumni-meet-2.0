import axios from "axios";

export const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "https://alumni-meet-2-0.onrender.com/api",
    withCredentials:true
}) 