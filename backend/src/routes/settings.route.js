import express from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller.js";
import protectRoute from "../middlewares/auth.middleware.js";

const router = express.Router();

// Publicly accessible for frontend fetching
router.get("/", getSettings);

// Protected for admin panel
router.patch("/", updateSettings);

export default router;
