import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { data } from "react-router-dom";
import toast from "react-hot-toast";


export const useAuthStore = create((set) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpatingProfile: false,

    isCheckingAuth: true,

    checkAuth: async () => {
        try {
            const res = axiosInstance.get("/auth/check");

            set({ authUser: res.data })

        } catch (error) {
            console.log("Error Auth Store : " + error.message);
            set({ authUser: null })
        } finally {
            set({ isCheckingAuth: false })
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true })
        try {
            const res = await axiosInstance.post("/auth/signup", data)
            set({ authUser: res.data })
            toast.success("Account Created Successfully !!")
        } catch (error) {
            toast.error(error.response.data.message)
        }
        finally {
            set({ isSigningUp: false })
        }

    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data)
            set({ authUser: res.data })
            toast.success("Logged In Succesfully")
        } catch (error) {
            toast.error(error.response.data.message)
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout")
            set({ authUser: null });
            toast.success("Logged out Successfully")
        } catch (error) {
            toast.error(error.response.data.message);

        }
    },

    fetchAttendance: async () => {
        try {
            const res = await axiosInstance.get("/auth/attendance");  // ✅ GET
            return res.data;   
        } catch (error) {
            console.error("Error fetching attendance:", error);
            throw error;
        }
    }





}))