import express from "express";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import Attendance from "../models/attendance.model.js";
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
            year: user.year,
            department: user.department,
            hasAttended: user.hasAttended
        })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

const signup = async (req, res) => {
    try {
        const { rollNo, password, name, className, year, department } = req.body;
        if (!rollNo || !password || !name || !className || !year || !department) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ rollNo });
        if (existingUser) {
            return res.status(400).json({ message: "Roll number already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            rollNo: rollNo.toUpperCase(),
            password: hashedPassword,
            name,
            className,
            year,
            department
        });

        await newUser.save();
        generateToken(newUser._id, res);

        return res.status(201).json({
            _id: newUser._id,
            name: newUser.name,
            rollNo: newUser.rollNo,
            className: newUser.className,
            year: newUser.year,
            department: newUser.department,
            hasAttended: newUser.hasAttended
        });
    } catch (error) {
        console.error("Signup error:", error);
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

const getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
};

const getDistinctAttributes = async (req, res) => {
    try {
        const years = await User.distinct("year");
        const departments = await User.distinct("department");
        res.status(200).json({ 
            success: true, 
            data: { 
                years: years.filter(Boolean).sort(), 
                departments: departments.filter(Boolean).sort() 
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch distinct attributes" });
    }
};

const getAttendance = async (req, res) => {
    try {
        const userId = req.user._id;
        const attendanceRecords = await Attendance.find({ userId }).populate("sessionId", "name locationName dateTime");
        res.status(200).json({ success: true, data: attendanceRecords });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch attendance history" });
    }
};

export { login, signup, logout, checkAuth, adminLogin, getUsers, getDistinctAttributes, getAttendance };