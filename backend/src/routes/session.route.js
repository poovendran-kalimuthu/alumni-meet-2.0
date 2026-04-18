import express from "express";
import { createSession, getSessions, updateSession, deleteSession, getActiveSessions, getSessionAttendance, updateManualAttendance, getSessionById } from "../controllers/session.controller.js";
import protectRoute from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/active", protectRoute, getActiveSessions); // Only accessible for logged-in students

router.get("/", protectRoute, getSessions);
router.post("/", protectRoute, createSession);
router.get("/:id/attendance", protectRoute, getSessionAttendance);
router.post("/:id/attendance/manual", protectRoute, updateManualAttendance);
router.get("/:id", protectRoute, getSessionById);
router.patch("/:id", protectRoute, updateSession);
router.delete("/:id", protectRoute, deleteSession);

export default router;
