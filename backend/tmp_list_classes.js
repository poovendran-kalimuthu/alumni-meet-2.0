import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({}, 'className');
    const classes = [...new Set(users.map(u => u.className))];
    console.log(JSON.stringify(classes, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
