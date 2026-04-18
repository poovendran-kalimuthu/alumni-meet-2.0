import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({}, 'department year');
    const depts = users.map(u => u.department);
    const uniqueDepts = [...new Set(depts)];
    
    console.log("Raw unique departments:", uniqueDepts.map(d => `'${d}'`));
    
    const counts = {};
    depts.forEach(d => {
        counts[d] = (counts[d] || 0) + 1;
    });
    console.log("Department counts:", counts);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
