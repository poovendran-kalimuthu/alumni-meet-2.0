import express from 'express';
import { login, logout, adminLogin } from '../controllers/auth.controller.js';
import protectRoute from "../middlewares/auth.middleware.js"
import { checkAuth } from '../controllers/auth.controller.js';
import User from '../models/user.model.js';
import Settings from '../models/settings.model.js';

const router = express.Router();


router.post("/login", login)
router.post("/admin/login", adminLogin)
router.post("/logout", logout)



router.get("/check", protectRoute, checkAuth);
router.get("/users", protectRoute, async (req, res) => {
    // Optional: add admin check here if needed
    try {
        const users = await User.find().select("-password");
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
});

router.patch("/users/:id/attendance", protectRoute, async (req, res) => {
    try {
        const { id } = req.params;
        const { hasAttended } = req.body;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "Student not found" });
        user.hasAttended = hasAttended;
        user.attendedAt = hasAttended ? new Date() : null;
        await user.save();
        res.status(200).json({ success: true, message: "Attendance updated", data: user });
    } catch (err) {
        res.status(500).json({ message: "Failed to update attendance" });
    }
});

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

router.post("/attendance", protectRoute, async (req, res) => {
    try {
        const { userLocation } = req.body;
        const studentId = req.user._id;

        if (!userLocation || userLocation.lat === undefined || userLocation.lng === undefined) {
            return res.status(400).json({ success: false, message: "User location data is missing" });
        }

        let settings = await Settings.findOne() || await Settings.create({});
        if (!settings.isAttendanceEnabled) {
            return res.status(403).json({ success: false, message: "Attendance system is disabled" });
        }

        const distance = calculateDistance(userLocation.lat, userLocation.lng, settings.lat, settings.lng);

        if (distance > settings.radius) {
            return res.status(403).json({ success: false, message: "Outside premises", distance: Math.round(distance) });
        }

        const user = await User.findById(studentId);
        if (user.hasAttended) return res.status(409).json({ success: false, message: "Attendance already marked" });

        user.hasAttended = true;
        user.attendedAt = new Date();
        await user.save();

        return res.status(201).json({ success: true, message: "Attendance saved successfully", distance: Math.round(distance) });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

export default router;