import mongoose from 'mongoose';
import Session from './src/models/session.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const sessions = await Session.find({});
    console.log("Total sessions:", sessions.length);
    console.log(JSON.stringify(sessions, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
