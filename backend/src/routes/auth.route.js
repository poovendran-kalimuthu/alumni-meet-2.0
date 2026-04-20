import express from 'express';
import { login, logout, signup, adminLogin, getUsers, getDistinctAttributes, getAttendance, createUser } from '../controllers/auth.controller.js';
import protectRoute from "../middlewares/auth.middleware.js"
import { checkAuth } from '../controllers/auth.controller.js';
import User from '../models/user.model.js';
import Settings from '../models/settings.model.js';
import Session from '../models/session.model.js';
import Attendance from '../models/attendance.model.js';

const router = express.Router();


router.post("/login", login)
router.post("/signup", signup)
router.post("/admin/login", adminLogin)
router.post("/logout", logout)



router.get("/check", protectRoute, checkAuth);
router.get("/users", protectRoute, getUsers); // Admin only
router.post("/users", protectRoute, createUser); // Admin only
router.get("/attributes", protectRoute, getDistinctAttributes); // For filtering options
router.get("/attendance", protectRoute, getAttendance); // For student history

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
        const { userLocation, sessionId } = req.body;
        const studentId = req.user._id;

        if (!userLocation || userLocation.lat === undefined || userLocation.lng === undefined) {
            return res.status(400).json({ success: false, message: "User location data is missing" });
        }

        // Logic for specific session if sessionId is provided
        if (sessionId) {
            const session = await Session.findById(sessionId);
            if (!session) return res.status(404).json({ success: false, message: "Session not found" });
            
            if (!session.isAttendanceEnabled) {
                return res.status(403).json({ success: false, message: "Attendance for this session is disabled" });
            }

            const distance = calculateDistance(userLocation.lat, userLocation.lng, session.lat, session.lng);
            if (distance > session.radius) {
                return res.status(403).json({ success: false, message: "Outside session premises", distance: Math.round(distance) });
            }

            // Check if already attended this specific session
            const existingAttendance = await Attendance.findOne({ userId: studentId, sessionId: sessionId });
            if (existingAttendance) {
                return res.status(409).json({ success: false, message: "Attendance already marked for this session" });
            }

            // Create new attendance record
            const attendance = new Attendance({
                userId: studentId,
                sessionId: sessionId,
                userLocation: {
                    lat: userLocation.lat,
                    lng: userLocation.lng,
                    accuracy: userLocation.accuracy
                },
                distance: Math.round(distance)
            });
            await attendance.save();

            // Also update legacy fields on user for compatibility
            await User.findByIdAndUpdate(studentId, {
                hasAttended: true,
                attendedAt: new Date()
            });

            return res.status(201).json({ success: true, message: "Attendance saved successfully", distance: Math.round(distance) });
        }

        // Fallback to legacy single-event settings if no sessionId is provided
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
        console.error("Attendance error:", error);
        res.status(500).json({ success: false, message: error.message || "Server error" });
    }
});

export default router;