import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const years = await User.distinct("year");
    const depts = await User.distinct("department");
    const sampleUsers = await User.find({}, 'rollNo className year department').limit(10);
    
    console.log("Distinct Years:", years);
    console.log("Distinct Departments:", depts);
    console.log("Sample Users:", JSON.stringify(sampleUsers, null, 2));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
