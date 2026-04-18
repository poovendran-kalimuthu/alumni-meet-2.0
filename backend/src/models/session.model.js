import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
    },
    dateTime: {
      type: String,
      required: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    radius: {
      type: Number,
      required: true,
      default: 200,
    },
    isAttendanceEnabled: {
      type: Boolean,
      default: true,
    },
    eligibleYears: {
      type: [String],
      default: [], // Empty means all years
    },
    eligibleDepartments: {
      type: [String],
      default: [], // Empty means all departments
    },
    locationPresets: [
      {
        name: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      }
    ]
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
