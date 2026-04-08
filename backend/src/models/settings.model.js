import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      required: true,
      default: 10.654281,
    },
    lng: {
      type: Number,
      required: true,
      default: 77.035257,
    },
    radius: {
      type: Number,
      required: true,
      default: 200,
    },
    isAttendanceEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    locationPresets: {
      type: [
        {
          name: { type: String, required: true },
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
        }
      ],
      default: []
    },
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
