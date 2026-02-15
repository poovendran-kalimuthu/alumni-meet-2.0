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
        console.log("Server Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

const logout = (req, res) => {
    res.cookie('jwt', '', {
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: 'strict'
    });
    return res.status(200).json({ message: "Logged out successfully" });
}



const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    }
    catch (error) {
        console.log("Error in checkAuth controller : " + error);
        res.status(500).json({ message: "Internal Server Error" })
    }
}
// routes/admin.route.js








export { login, logout, checkAuth };