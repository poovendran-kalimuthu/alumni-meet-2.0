import express from "express";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../lib/util.js";


const login = async (req, res) => {
    try {
        const { rollNo, password } = req.body;
        if (!rollNo || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const user = await User.findOne({ rollNo });
        if (!user) {
            return res.status(400).json({ message: "Invalid Credientials" });
        }

        const checkPassword = await bcrypt.compare(password, user.password);
        if (!checkPassword) {
            return res.status(400).json({ message: "Invalid Credientials" });
        }
        // Generating JWT token here
        generateToken(user._id, res);
        return res.status(200).json({
            _id: user._id,
            name: user.name,
            rollNo: user.rollNo,
            className: user.className,
            hasAttended: user.hasAttended
        })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

const logout = (req, res) => {
    res.cookie('jwt', '', {
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: process.env.NODE_ENV !== "development" ? 'none' : 'lax'
    });
    return res.status(200).json({ message: "Logged out successfully" });
}



const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    }
    catch (error) {
        res.status(500).json({ message: "Internal Server Error" })
    }
}

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const ADMIN_EMAIL = process.env.ADMIN_USERNAME || "admin@spectrum.com";
        const ADMIN_PASS = process.env.ADMIN_PASSWORD || "Spectrum@2026";

        if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
            generateToken("admin_id_001", res);
            return res.status(200).json({
                _id: "admin_id_001",
                name: "System Administrator",
                email: ADMIN_EMAIL,
                role: "admin"
            });
        } else {
            return res.status(401).json({ message: "Invalid Administrative Credentials" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export { login, logout, checkAuth, adminLogin };