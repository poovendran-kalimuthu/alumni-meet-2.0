import Settings from "../models/settings.model.js";

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({});
    }
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { lat, lng, radius, isAttendanceEnabled, locationPresets } = req.body;
    
    // Numeric validation
    if (lat !== undefined && isNaN(lat)) return res.status(400).json({ success: false, message: "Invalid Latitude" });
    if (lng !== undefined && isNaN(lng)) return res.status(400).json({ success: false, message: "Invalid Longitude" });
    if (radius !== undefined && isNaN(radius)) return res.status(400).json({ success: false, message: "Invalid Radius" });

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ lat, lng, radius, isAttendanceEnabled, locationPresets });
    } else {
      settings.lat = lat !== undefined ? lat : settings.lat;
      settings.lng = lng !== undefined ? lng : settings.lng;
      settings.radius = radius !== undefined ? radius : settings.radius;
      settings.isAttendanceEnabled = isAttendanceEnabled !== undefined ? isAttendanceEnabled : settings.isAttendanceEnabled;
      settings.locationPresets = locationPresets !== undefined ? locationPresets : settings.locationPresets;
      if (locationPresets !== undefined) settings.markModified('locationPresets');
    }

    await settings.save();
    
    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
