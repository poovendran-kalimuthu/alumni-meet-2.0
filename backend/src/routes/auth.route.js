import express from 'express';
import { login, logout } from '../controllers/auth.controller.js';
import protectRoute from "../middlewares/auth.middleware.js"
import { checkAuth } from '../controllers/auth.controller.js';
import User from '../models/user.model.js';

const router = express.Router();


router.post("/login", login)
router.post("/logout", logout)



router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password"); // exclude password
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
});


router.patch("/users/:id/attendance", async (req, res) => {
    try {
        const { id } = req.params;
        const { hasAttended } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "Student not found" });
        }

        user.hasAttended = hasAttended;
        user.attendedAt = hasAttended ? new Date() : null;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Attendance updated",
            data: user
        });
    } catch (err) {
        console.error("Update attendance error:", err);
        res.status(500).json({ message: "Failed to update attendance" });
    }
});



// Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

router.post("/attendance", async (req, res) => {
    try {
        const { studentId, event, userLat, userLng } = req.body;

        // 🔐 Basic validation

        // 📍 EVENT LOCATION (ADMIN CONTROLLED)
        const EVENT_LOCATION = {
            lat: 10.654281,
            lng:  77.035257
        };

        const PREMISES_RADIUS = 200; // meters

        // 📐 Distance check
        const distance = calculateDistance(
            userLat,
            userLng,
            EVENT_LOCATION.lat,
            EVENT_LOCATION.lng
        );

        if (distance > PREMISES_RADIUS) {
            return res.status(403).json({
                success: false,
                message: "Outside premises",
                distance: Math.round(distance)
            });
        }
        const already = await User.findOne({ studentId, event });
        if (already) {
            return res.status(409).json({
                success: false,
                message: "Attendance already marked"
            });
        }


        await User.findByIdAndUpdate(studentId, {
            hasAttended: true,
            attendedAt: new Date()
        });

        return res.status(201).json({
            success: true,
            message: "Attendance saved successfully",
            distance: Math.round(distance),
        });

    } catch (error) {
        console.error("Attendance API error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});







router.get("/check", protectRoute, checkAuth);

export default router;