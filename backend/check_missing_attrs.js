import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await User.countDocuments({ 
        $or: [
            { year: { $exists: false } }, 
            { year: "" }, 
            { department: { $exists: false } }, 
            { department: "" }
        ] 
    });
    console.log("Users with missing attributes:", count);
    
    // Check all unique departments in className
    const users = await User.find({}, 'className');
    const classes = [...new Set(users.map(u => u.className))];
    console.log("Unique ClassNames in DB:", classes);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
