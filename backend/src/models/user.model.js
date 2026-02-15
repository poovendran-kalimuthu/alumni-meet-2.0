import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    rollNo: { type: String},
    name: { type: String, trim: true },
    className: { type: String, trim: true },   // eg: CSE-A, IT-2, 3rdYear

    password: { type: String, required: true },

    isActive: { type: Boolean, default: true },
    hasAttended: { type: Boolean, default: false },
    attendedAt: { type: Date, default: null },

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", UserSchema);
