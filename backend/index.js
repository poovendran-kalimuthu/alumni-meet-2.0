import express from 'express';
import authRoutes from "./src/routes/auth.route.js";
import settingsRoutes from "./src/routes/settings.route.js";
import sessionRoutes from "./src/routes/session.route.js";
import dotenv from 'dotenv';
import { connectDB } from './src/lib/db.js';
import cookieParser from "cookie-parser";
import cors from "cors";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;
app.use(
    cors({
        origin: [
            "https://alumni-meet-2-0.vercel.app",
            "https://alumni-meet-2-0.vercel.app/",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175"
        ],
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/sessions", sessionRoutes);
app.listen(PORT, "0.0.0.0", async () => {
    console.log("Server is connected to the PORT : " + PORT);
    await connectDB();
    console.log("Happy Hacking !!");
});
