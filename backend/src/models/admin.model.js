import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
    {
        lat: {
            type: Number,
            required: true,
        },

        long: {
            type: Number,
            required: true,
        },

        radius: {
            type: Number, // in meters
            required: true,
            min: 1
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
