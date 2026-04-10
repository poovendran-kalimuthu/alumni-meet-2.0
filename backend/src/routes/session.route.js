import express from "express";
import { createSession, getSessions, updateSession, deleteSession, getActiveSessions, getSessionAttendance, updateManualAttendance } from "../controllers/session.controller.js";
import protectRoute from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/active", getActiveSessions); // Publicly accessible for students

router.get("/", protectRoute, getSessions);
router.post("/", protectRoute, createSession);
router.get("/:id/attendance", protectRoute, getSessionAttendance);
router.post("/:id/attendance/manual", protectRoute, updateManualAttendance);
router.patch("/:id", protectRoute, updateSession);
router.delete("/:id", protectRoute, deleteSession);

export default router;
