import axios from "axios";

export const axiosInstance = axios.create({
    baseURL:"https://alumni-meet-2-0.onrender.com/api",
    withCredentials:true
}) 