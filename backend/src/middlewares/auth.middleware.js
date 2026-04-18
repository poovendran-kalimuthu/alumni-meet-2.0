import jwt, { decode } from "jsonwebtoken";
import User from "../models/user.model.js";

const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Not Authorized - No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    

    if(!decoded){
        return res.status(401).json({message:"Unauthorized - Not valid token"})
    }
    

    let user;
    if (decoded.id === "admin_id_001") {
        user = {
            _id: "admin_id_001",
            name: "System Administrator",
            role: "admin"
        };
    } else {
        user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      console.log("ProtectRoute: User not found for ID:", decoded.id);
      return res.status(404).json({ message: "Authenticated user not found in database. Please log out and log in again." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("ProtectRoute Error:", error.message);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export default protectRoute;
