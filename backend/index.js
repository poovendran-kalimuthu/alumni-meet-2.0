import express from 'express';
import authRoutes from "./src/routes/auth.route.js";
import dotenv from 'dotenv';
import { connectDB } from './src/lib/db.js';
import cookieParser from "cookie-parser";
import cors from "cors";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({
    
    origin: "https://alumni-meet-2-0.vercel.app",   
    credentials: true

}));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.listen(PORT, "0.0.0.0", async () => {
    console.log("Server is connected to the PORT : " + PORT);
    await connectDB();
    console.log("Happy Hacking !!");
});
    