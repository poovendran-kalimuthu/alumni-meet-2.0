import Session from "../models/session.model.js";
import Attendance from "../models/attendance.model.js";

export const createSession = async (req, res) => {
  try {
    const session = new Session(req.body);
    await session.save();
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateSession = async (req, res) => {
  try {
    const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteSession = async (req, res) => {
  try {
    await Session.findByIdAndDelete(req.params.id);
    // Optionally delete all attendance for this session
    await Attendance.deleteMany({ sessionId: req.params.id });
    res.status(200).json({ success: true, message: "Session deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getActiveSessions = async (req, res) => {
  try {
    const userYear = req.user?.year;
    const userDept = req.user?.department;

    let sessions = await Session.find({ isAttendanceEnabled: true }).sort({ createdAt: -1 });

    // Filter sessions based on eligibility
    sessions = sessions.filter(session => {
      try {
        const yearMatch = !session.eligibleYears || session.eligibleYears.length === 0 || session.eligibleYears.includes(userYear);
        const deptMatch = !session.eligibleDepartments || session.eligibleDepartments.length === 0 || session.eligibleDepartments.includes(userDept);
        return yearMatch && deptMatch;
      } catch (e) {
        console.error("Filter Error for session:", session._id, e.message);
        return false;
      }
    });

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error("getActiveSessions Error:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
};

export const getSessionAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ sessionId: req.params.id })
      .populate('userId', 'name rollNo className email');
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateManualAttendance = async (req, res) => {
  const { sessionId, userId, status } = req.body;
  try {
    if (status === "present") {
      // Create record if not exists
      const existing = await Attendance.findOne({ sessionId, userId });
      if (!existing) {
        const attendance = new Attendance({
          sessionId,
          userId,
          userLocation: { lat: 0, lng: 0 }, // Manual entry
          timestamp: new Date()
        });
        await attendance.save();
      }
    } else {
      // Remove record
      await Attendance.findOneAndDelete({ sessionId, userId });
    }
    res.status(200).json({ success: true, message: "Attendance updated manually" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
export const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      console.log("Session not found for ID:", req.params.id);
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error("GetSessionById Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
