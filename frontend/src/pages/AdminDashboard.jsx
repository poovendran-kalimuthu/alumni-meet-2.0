import React, { useState, useEffect, useMemo } from "react";
import { axiosInstance } from "../lib/axios";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { 
  LayoutDashboard, Users, Calendar, Activity, 
  Settings, LogOut, ChevronRight, Search, 
  Download, RefreshCcw, MapPin, Clock, 
  CheckCircle2, XCircle, MoreVertical, 
  Copy, ExternalLink, Shield, Layers, Command, Save, UserPlus,
  Plus, Settings2, Trash2, Fingerprint, Navigation, Maximize, ShieldCheck
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import * as XLSX from 'xlsx';

const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingStatus, setEditingStatus] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [yearFilter, setYearFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  
  const [availableYears, setAvailableYears] = useState([]);
  const [availableDepts, setAvailableDepts] = useState([]);
  
  const [activeTab, setActiveTab] = useState("overview"); // overview, sessions, session-detail
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState("registry"); // registry, settings
  
  const [sessionFormData, setSessionFormData] = useState({
    name: "",
    locationName: "",
    dateTime: "",
    lat: 10.654281,
    lng: 77.035257,
    radius: 200,
    isAttendanceEnabled: true,
    eligibleYears: [],
    eligibleDepartments: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkCommon, setBulkCommon] = useState({ className: "", year: "1st Year", department: "CSE", password: "" });
  const [bulkRawText, setBulkRawText] = useState("");
  const [bulkPreview, setBulkPreview] = useState([]); // [{rollNo, name}]
  const [bulkResult, setBulkResult] = useState(null); // {created, skipped}
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserFormData, setNewUserFormData] = useState({
    rollNo: "",
    name: "",
    className: "",
    year: "",
    department: "",
    password: ""
  });

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    loadUsers();
    loadSessions();
    loadAttributes();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/auth/users");
      setStudents(res.data.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await axiosInstance.get("/sessions");
      if (res.data.success) {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error("Fetch sessions error:", err);
      toast.error("Failed to load sessions from server");
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadSessionAttendance = async (sessionId) => {
    if (!sessionId) return;
    try {
      const res = await axiosInstance.get(`/sessions/${sessionId}/attendance`);
      if (res.data.success) {
        setSessionAttendance(res.data.data);
      }
    } catch (err) {
      console.error("Fetch session attendance error:", err);
    }
  };

  const loadAttributes = async () => {
    try {
      const res = await axiosInstance.get("/auth/attributes");
      if (res.data.success) {
        setAvailableYears(res.data.data.years);
        setAvailableDepts(res.data.data.departments);
      }
    } catch (err) {
      console.error("Fetch attributes error:", err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await axiosInstance.post("/auth/users", newUserFormData);
      if (res.data.success) {
        toast.success("User created successfully!");
        setStudents(prev => [...prev, res.data.data]);
        setIsCreateModalOpen(false);
        setNewUserFormData({
          rollNo: "",
          name: "",
          className: "",
          year: "",
          department: "",
          password: ""
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setIsSaving(false);
    }
  };

  const parseBulkText = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0].toLowerCase();
      // If the first line looks like a header (contains "roll" or "name"), skip it
      if (firstLine.includes("roll") || firstLine.includes("name")) {
        lines.shift();
      }
    }
    return lines.map(line => {
      const parts = line.split(",").map(p => p.trim());
      return { rollNo: parts[0] || "", name: parts.slice(1).join(",").trim() || "" };
    }).filter(r => r.rollNo || r.name);
  };

  const handleBulkFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    reader.onload = (ev) => {
      if (isExcel) {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          const parsed = jsonData
            .filter(row => row.length > 0)
            .map(row => ({
              rollNo: row[0]?.toString().trim() || "",
              name: row[1]?.toString().trim() || ""
            }))
            .filter(u => u.rollNo || u.name);

          if (parsed.length > 0) {
            const first = parsed[0];
            if (first.rollNo.toLowerCase().includes("roll") || first.name.toLowerCase().includes("name")) {
              parsed.shift();
            }
          }

          setBulkPreview(parsed);
          setBulkRawText(parsed.map(u => `${u.rollNo}, ${u.name}`).join("\n"));
          toast.success(`Parsed ${parsed.length} records from Excel`);
        } catch (err) {
          toast.error("Error parsing Excel file");
          console.error(err);
        }
      } else {
        const text = ev.target.result;
        setBulkRawText(text);
        setBulkPreview(parseBulkText(text));
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkPreview.length === 0) return toast.error("No users parsed. Check CSV format.");
    if (!bulkCommon.password || bulkCommon.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (!bulkCommon.className || !bulkCommon.year || !bulkCommon.department) return toast.error("Class, Year and Department are required");
    setIsBulkSaving(true);
    try {
      const res = await axiosInstance.post("/auth/users/bulk", {
        users: bulkPreview,
        password: bulkCommon.password,
        className: bulkCommon.className,
        year: bulkCommon.year,
        department: bulkCommon.department
      });
      if (res.data.success) {
        setBulkResult(res.data.data);
        toast.success(res.data.message);
        loadUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk upload failed");
    } finally {
      setIsBulkSaving(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionAttendance(selectedSessionId);
      const session = sessions.find(s => s._id === selectedSessionId);
      if (session) {
        setSessionFormData({
          ...session,
          eligibleYears: session.eligibleYears || [],
          eligibleDepartments: session.eligibleDepartments || []
        });
      }
    }
  }, [selectedSessionId, sessions]);

  const selectedSession = useMemo(() => 
    sessions.find(s => s._id === selectedSessionId), 
    [sessions, selectedSessionId]
  );

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (selectedSessionId) {
        const res = await axiosInstance.patch(`/sessions/${selectedSessionId}`, sessionFormData);
        if (res.data.success) {
          toast.success("Session updated successfully!");
          setSessions(prev => prev.map(s => s._id === selectedSessionId ? res.data.data : s));
        }
      } else {
        const res = await axiosInstance.post("/sessions", sessionFormData);
        if (res.data.success) {
          toast.success("Session created successfully!");
          setSessions(prev => [res.data.data, ...prev]);
          setActiveTab("sessions");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save session");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSessionStatus = async (session) => {
    try {
      const res = await axiosInstance.patch(`/sessions/${session._id}`, { isAttendanceEnabled: !session.isAttendanceEnabled });
      if (res.data.success) {
        setSessions(prev => prev.map(s => s._id === session._id ? res.data.data : s));
        toast.success(`Session ${res.data.data.isAttendanceEnabled ? 'Enabled' : 'Disabled'}`);
      }
    } catch (err) {
      toast.error("Failed to toggle status");
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Are you sure you want to delete this session? All associated attendance records will be lost.")) return;
    try {
      const res = await axiosInstance.delete(`/sessions/${id}`);
      if (res.data.success) {
        toast.success("Session deleted");
        setSessions(prev => prev.filter(s => s._id !== id));
        setSelectedSessionId(null);
        setActiveTab("sessions");
      }
    } catch (err) {
      toast.error("Failed to delete session");
    }
  };

  const copySessionLink = (id) => {
    const url = `${window.location.origin}/session/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Session link copied to clipboard!");
  };

  const updateAttendance = async (studentId, newStatus) => {
    if (!selectedSessionId) return;
    try {
      await axiosInstance.post(
        `/sessions/${selectedSessionId}/attendance/manual`,
        { 
          sessionId: selectedSessionId,
          userId: studentId,
          status: newStatus 
        }
      );
      toast.success("Attendance updated");
      loadSessionAttendance(selectedSessionId);
      setEditingStudent(null);
    } catch (err) { 
      toast.error(err.response?.data?.message || "Failed to update attendance");
    }
  };

  const exportToPDF = () => {
    if (!selectedSession) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SPECTRUM Attendance Report", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Session: ${selectedSession.name}`, 105, 30, { align: "center" });
    doc.text(`Location: ${selectedSession.locationName} | Date: ${selectedSession.dateTime}`, 105, 37, { align: "center" });
    
    const tableColumn = ["Roll No", "Student Name", "Class", "Status", "Verified At"];
    const tableRows = filteredStudents.map(s => {
      const att = getAttendanceForUser(s._id);
      return [
        s.rollNo,
        s.name,
        s.className,
        att ? "PRESENT" : "ABSENT",
        att ? new Date(att.timestamp).toLocaleTimeString() : "-"
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`Attendance_${selectedSession.name.replace(/\s+/g, '_')}.pdf`);
  };

  const getAttendanceForUser = (userId) => {
    return sessionAttendance.find(a => (a.userId?._id || a.userId) === userId);
  };

  const eligibleStudents = useMemo(() => {
    if (!selectedSessionId || !selectedSession) return students;
    
    console.log("Filtering for session:", selectedSession.name, "Eligible Depts:", selectedSession.eligibleDepartments);
    const filtered = students.filter(s => {
      const yearMatch = !selectedSession.eligibleYears || selectedSession.eligibleYears.length === 0 || selectedSession.eligibleYears.includes(s.year);
      const deptMatch = !selectedSession.eligibleDepartments || selectedSession.eligibleDepartments.length === 0 || selectedSession.eligibleDepartments.includes(s.department);
      return yearMatch && deptMatch;
    });
    console.log("Total students found:", filtered.length);
    return filtered;
  }, [students, selectedSession, selectedSessionId]);

  const filteredStudents = useMemo(() => {
    return eligibleStudents.filter(s => {
      const attendance = getAttendanceForUser(s._id);
      const isPresent = !!attendance;
      const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || 
                            s.rollNo?.toString().includes(search);
      const matchesStatus = statusFilter === "all" || (statusFilter === "present" ? isPresent : !isPresent);
      const matchesYear = yearFilter === "all" || s.year === yearFilter;
      const matchesDept = deptFilter === "all" || s.department === deptFilter;
      return matchesSearch && matchesStatus && matchesYear && matchesDept;
    });
  }, [eligibleStudents, sessionAttendance, search, statusFilter, yearFilter, deptFilter]);

  const stats = useMemo(() => {
    const total = eligibleStudents.length;
    const present = sessionAttendance.length;
    return { 
      total, 
      present, 
      absent: Math.max(0, total - present), 
      rate: total > 0 ? ((present / total) * 100).toFixed(1) : 0 
    };
  }, [eligibleStudents, sessionAttendance]);

  // Mock chart data - in production this would come from backend
  const chartData = [
    { name: 'Jan', present: 400, expected: 600 },
    { name: 'Feb', present: 300, expected: 550 },
    { name: 'Mar', present: 200, expected: 480 },
    { name: 'Apr', present: 278, expected: 520 },
    { name: 'May', present: 189, expected: 460 },
    { name: 'Jun', present: 239, expected: 530 },
    { name: 'Jul', present: 349, expected: 580 },
    { name: 'Aug', present: stats.present, expected: stats.total },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-secondary">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">Initializing Dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-secondary flex overflow-hidden">
      
      {/* Sidebar - Enhanced Premium Floating Design */}
      <aside className="w-80 bg-slate-900 border-r border-white/5 hidden lg:flex flex-col relative shrink-0 m-4 rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500 ease-in-out">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="p-10 flex items-center gap-4 mb-8 relative z-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/40 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500">
            <Shield className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold tracking-tighter text-white">SPECTRUM</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.25em]">Attendance OS</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto no-scrollbar relative z-10">
          <p className="px-5 mb-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Institutional Terminal</p>
          <nav className="space-y-2">
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Operational Hub" active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setSelectedSessionId(null); }} />
            <SidebarItem icon={<Layers size={20} />} label="Verification Events" active={activeTab === "sessions"} onClick={() => { setActiveTab("sessions"); setSelectedSessionId(null); }} badge={sessions.length.toString()} />
            <SidebarItem icon={<Users size={20} />} label="Master Registry" active={false} onClick={() => {}} />
            <SidebarItem icon={<Activity size={20} />} label="Live Analytics" active={false} onClick={() => {}} />
          </nav>

          {selectedSessionId && (
            <div className="mt-10 animate-in slide-in-from-left-4 duration-500">
              <p className="px-5 mb-6 text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em]">Workspace Context</p>
              <nav className="space-y-2">
                <SidebarItem icon={<Users size={20} />} label="Session Registry" active={activeTab === "session-detail" && workspaceTab === "registry"} onClick={() => { setActiveTab("session-detail"); setWorkspaceTab("registry"); }} />
                <SidebarItem icon={<Settings size={20} />} label="Geofence Protocol" active={activeTab === "session-detail" && workspaceTab === "settings"} onClick={() => { setActiveTab("session-detail"); setWorkspaceTab("settings"); }} />
              </nav>
            </div>
          )}
        </div>

        <div className="mt-auto p-8 relative z-10">
          <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex items-center gap-4 backdrop-blur-md hover:bg-white/10 transition-all cursor-pointer group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
              {localStorage.getItem("admin_email")?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">
                {localStorage.getItem("admin_email")?.split('@')[0].toUpperCase() || "ADMIN"}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Secure Node</p>
            </div>
            <button className="p-2.5 text-slate-400 hover:text-rose-400 transition-colors hover:bg-rose-400/10 rounded-xl">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F8FAFC]">
        {/* Header - Personalized & Premium */}
        <header className="sticky top-0 z-40 bg-white/60 backdrop-blur-2xl border-b border-slate-200/40 px-12 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[9px] font-bold text-indigo-600 uppercase tracking-widest">
                Security Level 04
              </div>
              {selectedSessionId && (
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <ChevronRight size={10} />
                  <span className="text-indigo-600">{selectedSession?.name}</span>
                </div>
              )}
            </div>
            <h2 className="text-4xl font-heading font-bold text-slate-900 tracking-tighter">
              Genesis Terminal, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 uppercase">{localStorage.getItem("admin_email")?.split('@')[0] || "Director"}</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5 opacity-70">Orchestrating institutional data synchronization</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none flex items-center gap-3 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-slate-600 text-[10px] font-bold uppercase tracking-widest shadow-sm">
              <Calendar size={14} className="text-indigo-500" />
              {currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
              <div className="flex items-center gap-1.5 text-indigo-600">
                <Clock size={14} />
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            
            <button 
              onClick={() => { loadUsers(); loadSessions(); }} 
              className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all hover:shadow-xl hover:shadow-indigo-500/10 active:scale-95 group"
            >
              <RefreshCcw size={20} className={`${sessionsLoading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-700"}`} />
            </button>

            {activeTab === "session-detail" && (
              <button 
                onClick={exportToPDF} 
                className="flex items-center gap-2.5 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 shadow-2xl shadow-slate-900/30 transition-all active:scale-95"
              >
                <Download size={16} /> Export Intelligence
              </button>
            )}
          </div>
        </header>

        <main className="p-8 max-w-[1400px] mx-auto w-full space-y-8">
          
          {/* View: Overview (Global) - Reference Style */}
          {activeTab === "overview" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <MetricCard 
                  label="Master Registry" 
                  value={students.length} 
                  icon={<Users className="w-6 h-6" />} 
                  trend="+2.5% Yield" 
                  isUp={true} 
                  color="indigo" 
                />
                <MetricCard 
                  label="Network Stability" 
                  value="98.2%" 
                  icon={<Activity className="w-6 h-6" />} 
                  trend="Ultra Link" 
                  isUp={true} 
                  color="emerald" 
                />
                <MetricCard 
                  label="Active Protocols" 
                  value={sessions.filter(s => s.isAttendanceEnabled).length} 
                  icon={<Layers className="w-6 h-6" />} 
                  trend="Live Sync" 
                  isUp={true} 
                  color="blue" 
                />
                <MetricCard 
                  label="Pending Records" 
                  value="240" 
                  icon={<Clock className="w-6 h-6" />} 
                  trend="-4% Queue" 
                  isUp={true} 
                  color="rose" 
                />
              </div>

              {/* Institutional Report & Global Insight */}
              <div className="flex flex-col xl:flex-row gap-8">
                <div className="flex-1 bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50/30 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-50/50 transition-colors duration-1000" />
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-10">
                      <div>
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2">Global Attendance Index</h3>
                        <div className="flex items-baseline gap-4">
                          <span className="text-6xl font-heading font-bold text-slate-900 tracking-tighter">94.8%</span>
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold border border-emerald-100 shadow-sm flex items-center gap-1.5">
                            <Activity size={12} /> Optimization Peak
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-xl transition-all">Daily</button>
                        <button className="px-5 py-2.5 bg-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white shadow-xl shadow-indigo-600/30">Weekly</button>
                      </div>
                    </div>

                    <div style={{ height: 350, width: '100%' }} className="mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '20px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}
                            cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                          />
                          <Area type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorPresent)" animationDuration={2000} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="w-full xl:w-96 flex flex-col gap-6">
                  <div className="bg-indigo-600 rounded-[3.5rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-indigo-600/40 flex-1 flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                    <div className="relative z-10">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-xl group-hover:rotate-12 transition-transform duration-500">
                        <CheckCircle2 size={26} className="text-white" />
                      </div>
                      <h4 className="text-3xl font-heading font-bold mb-4 tracking-tight">Institutional Health</h4>
                      <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-80">
                        Operational efficiency has increased by 12% following the deployment of new verification protocols.
                      </p>
                    </div>
                    <button className="relative z-10 mt-10 w-full py-5 bg-white text-indigo-600 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all shadow-2xl group-active:scale-95">
                      Operational Audit
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Active Sessions Component */}
              <div className="bg-white rounded-[3.5rem] border border-slate-100 p-12 shadow-[0_20px_60px_rgba(0,0,0,0.01)] relative overflow-hidden group">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Rapid Access Terminal</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Direct bridge to active verification nodes</p>
                  </div>
                  <button onClick={() => setActiveTab("sessions")} className="group flex items-center gap-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest bg-indigo-50 px-6 py-3 rounded-xl transition-all">
                    View Matrix <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sessions.slice(0, 6).map(session => (
                    <div 
                      key={session._id} 
                      onClick={() => { setSelectedSessionId(session._id); setActiveTab("session-detail"); setWorkspaceTab("registry"); }}
                      className="cursor-pointer p-8 bg-slate-50/50 hover:bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-2 border border-slate-100/50 transition-all duration-500 rounded-[3rem] group/card relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover/card:bg-indigo-500/10 transition-colors" />
                      <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl shadow-slate-200 group-hover/card:bg-indigo-600 group-hover/card:text-white transition-all duration-500 border border-slate-50">
                          <Layers size={24} />
                        </div>
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border shadow-sm ${session.isAttendanceEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                          {session.isAttendanceEnabled ? 'Terminal Live' : 'Node Offline'}
                        </span>
                      </div>
                      <h4 className="text-xl font-heading font-bold text-slate-900 truncate mb-1.5 group-hover/card:text-indigo-600 transition-colors">{session.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em] flex items-center gap-2">
                        <MapPin size={12} className="text-indigo-500" /> {session.locationName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View: Sessions Gallery - Premium Grid System */}
          {activeTab === "sessions" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.01)] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-125 transition-transform duration-1000" />
                 <div className="relative z-10">
                   <h3 className="text-4xl font-heading font-bold text-slate-900 tracking-tighter">Session Matrix</h3>
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.25em] mt-1.5 opacity-70">Managing geo-fenced verification nodes</p>
                 </div>
                 <button 
                    onClick={() => {
                      setSessionFormData({ name: "", locationName: "", lat: 11.235, lng: 77.123, radius: 250, department: "all", year: "all" });
                      setSelectedSessionId(null);
                      setActiveTab("session-detail");
                      setWorkspaceTab("settings");
                    }} 
                    className="relative z-10 flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 group/btn"
                 >
                    <Plus size={18} className="group-hover/btn:rotate-90 transition-transform" /> Initialize New Protocol
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                 {sessions.map(session => (
                   <div 
                     key={session._id} 
                     className="group relative bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_25px_60px_rgba(79,70,229,0.12)] hover:-translate-y-3 transition-all duration-700 overflow-hidden flex flex-col h-full"
                   >
                     {/* Card Header Decoration */}
                     <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${session.isAttendanceEnabled ? 'from-emerald-500 to-teal-400' : 'from-slate-200 to-slate-100'}`} />
                     
                     <div className="flex justify-between items-start mb-10">
                       <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${session.isAttendanceEnabled ? 'bg-indigo-600 text-white shadow-indigo-600/40' : 'bg-slate-100 text-slate-400'}`}>
                         <Layers size={28} />
                       </div>
                       <div className="flex flex-col items-end">
                         <span className={`px-4 py-2 rounded-2xl text-[9px] font-bold uppercase tracking-widest border shadow-sm transition-colors duration-500 ${session.isAttendanceEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                           {session.isAttendanceEnabled ? 'Sync Live' : 'Interface Idle'}
                         </span>
                         <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-2">{session._id.slice(-8).toUpperCase()}</p>
                       </div>
                     </div>

                     <div className="mb-10 flex-1">
                       <h4 className="text-2xl font-heading font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors duration-500 line-clamp-1">{session.name}</h4>
                       <div className="flex items-center gap-3 text-slate-500 group-hover:text-slate-600 transition-colors">
                         <MapPin size={16} className="text-indigo-500" />
                         <span className="text-[11px] font-bold uppercase tracking-widest truncate">{session.locationName}</span>
                       </div>
                     </div>

                     <div className="flex items-center justify-between pt-8 border-t border-slate-50 gap-4 mt-auto relative z-10">
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1 whitespace-nowrap">Target Cluster</span>
                           <span className="text-xs font-bold text-slate-600 truncate">{session.department} · {session.year} Yr</span>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => { setSelectedSessionId(session._id); setActiveTab("session-detail"); setWorkspaceTab("registry"); }}
                             className="w-12 h-12 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-600/40 transition-all duration-500 active:scale-90 group/arrow"
                           >
                             <ChevronRight size={20} className="group-hover/arrow:translate-x-1 transition-transform" />
                           </button>
                           <button 
                             onClick={() => toggleSessionStatus(session)}
                             className={`w-12 h-12 rounded-[1.25rem] border flex items-center justify-center transition-all ${session.isAttendanceEnabled ? 'border-rose-100 text-rose-500 bg-rose-50/30 hover:bg-rose-50 shadow-sm shadow-rose-500/10' : 'border-emerald-100 text-emerald-500 bg-emerald-50/30 hover:bg-emerald-50 shadow-sm shadow-emerald-500/10'}`}
                           >
                             {session.isAttendanceEnabled ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                           </button>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
                 
                 {sessions.length === 0 && !sessionsLoading && (
                    <div className="col-span-full py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                      <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-8">
                        <Layers size={32} className="text-slate-200" />
                      </div>
                      <p className="text-slate-800 font-bold text-xl tracking-tight">Gallery is Empty</p>
                      <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto font-medium leading-relaxed">Create your first attendance session to begin orchestrating verification events.</p>
                      <button 
                        onClick={() => { setActiveTab("session-detail"); setWorkspaceTab("settings"); }} 
                        className="mt-10 px-10 py-4 bg-indigo-600 text-white rounded-[1.25rem] font-bold text-sm shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                      >
                        Initialize First Session
                      </button>
                    </div>
                 )}
            </div>
          )}

          {/* View: Session Workspace (Drill-down Hub) */}
          {activeTab === "session-detail" && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12">
              
              {/* Workspace Intelligence Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <MetricCard 
                  label="Registry Size" 
                  value={stats.total} 
                  icon={<Users className="w-6 h-6" />} 
                  trend="Target Base" 
                  isUp={true} 
                  color="indigo" 
                />
                <MetricCard 
                  label="Verified Present" 
                  value={stats.present} 
                  icon={<CheckCircle2 className="w-6 h-6" />} 
                  trend="Live Sync" 
                  isUp={true} 
                  color="emerald" 
                />
                <MetricCard 
                  label="Absence Log" 
                  value={stats.absent} 
                  icon={<XCircle className="w-6 h-6" />} 
                  trend="Gap Analysis" 
                  isUp={false} 
                  color="rose" 
                />
                <MetricCard 
                  label="Sync Efficiency" 
                  value={`${stats.rate}%`} 
                  icon={<Activity className="w-6 h-6" />} 
                  trend="Optimization" 
                  isUp={true} 
                  color="blue" 
                />
              </div>

              {/* Workspace Navigation Terminal */}
              <div className="bg-white border-b border-slate-100 flex p-2 gap-2 rounded-3xl w-fit shadow-2xl shadow-slate-200/50">
                <button 
                  onClick={() => setWorkspaceTab("registry")}
                  className={`px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${workspaceTab === 'registry' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  Registry Matrix
                </button>
                <button 
                  onClick={() => setWorkspaceTab("settings")}
                  className={`px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${workspaceTab === 'settings' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  Geofence Protocol
                </button>
                {selectedSessionId && (
                  <button 
                    onClick={() => copySessionLink(selectedSessionId)}
                    className="px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2"
                  >
                    <Copy size={14} /> Copy Public Link
                  </button>
                )}
              </div>

               {/* Workspace Content: Registry - Enhanced Table */}
              {workspaceTab === "registry" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  {/* Registry Controls Matrix */}
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.01)] flex flex-col xl:flex-row justify-between gap-8 items-start xl:items-center">
                    <div className="flex-1 w-full max-w-xl relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                      <input 
                        type="text" 
                        placeholder="Scan Registry Identifier..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] py-4 pl-16 pr-8 text-xs font-bold uppercase tracking-widest outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                      />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-200">
                        <button onClick={() => setStatusFilter("all")} className={`px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>All</button>
                        <button onClick={() => setStatusFilter("present")} className={`px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${statusFilter === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-emerald-600'}`}>Present</button>
                        <button onClick={() => setStatusFilter("absent")} className={`px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${statusFilter === 'absent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-rose-600'}`}>Absent</button>
                      </div>
                      <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="xl:ml-4 flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-3xl text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-slate-800 transition-all active:scale-95 shadow-2xl shadow-slate-900/20"
                      >
                        <UserPlus size={16} /> Deploy New Record
                       </button>
                       <button 
                         onClick={() => { setIsBulkModalOpen(true); setBulkResult(null); setBulkPreview([]); setBulkRawText(""); }}
                         className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-3xl text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-indigo-700 transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                         Bulk Upload
                      </button>
                    </div>
                  </div>

                  {/* Registry Matrix Table */}
                  <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.01)] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100">Student Profile</th>
                            <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100">Identifier</th>
                            <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100">Deployment</th>
                            <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100">Verification Status</th>
                            <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 text-right">Action Protocol</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredStudents.map((student) => {
                            const isPresent = sessionAttendance.some(a => a.studentId?._id === student._id);
                            return (
                              <tr key={student._id} className="group hover:bg-slate-50/30 transition-all duration-500">
                                <td className="px-10 py-6">
                                  <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${isPresent ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-slate-100 text-slate-400 shadow-slate-200/50'}`}>
                                      {student.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-900 tracking-tight">{student.name}</span>
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{student.email || 'Registry Record'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-10 py-6">
                                  <span className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest shadow-sm">
                                    {student.rollNo}
                                  </span>
                                </td>
                                <td className="px-10 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                  {student.department} · {student.year} Year
                                </td>
                                <td className="px-10 py-6">
                                  <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl text-[9px] font-bold uppercase tracking-[0.2em] border shadow-sm transition-all duration-700 ${isPresent ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5' : 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-500/5'}`}>
                                    <div className={`w-2 h-2 rounded-full ${isPresent ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                                    {isPresent ? 'Verified' : 'Absent'}
                                  </span>
                                </td>
                                <td className="px-10 py-6 text-right">
                                  <button 
                                    onClick={() => { setEditingStudent(student); setEditingStatus(isPresent ? "present" : "absent"); }}
                                    className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 transition-all active:scale-90"
                                  >
                                    <Settings2 size={20} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {filteredStudents.length === 0 && (
                        <div className="py-32 text-center bg-white">
                          <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-center mx-auto mb-8 shadow-sm">
                            <Users size={40} className="text-slate-200" />
                          </div>
                          <p className="text-slate-900 font-bold text-xl tracking-tight">Access Denied: Record Missing</p>
                          <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto font-medium leading-relaxed opacity-70 italic font-heading">The identifier provided does not match any node in the current cluster matrix.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Workspace Content: Geofence Protocol Configuration */}
              {workspaceTab === "settings" && (
                <div className="bg-white rounded-[3.5rem] border border-slate-100 p-12 shadow-[0_20px_60px_rgba(0,0,0,0.01)] animate-in fade-in duration-700 space-y-12">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 pb-10 border-b border-slate-50">
                    <div>
                      <h3 className="text-3xl font-heading font-bold text-slate-900 tracking-tight flex items-center gap-4">
                         <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                            <Shield size={32} />
                         </div>
                         Geofence Protocol
                      </h3>
                      <p className="text-slate-400 mt-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Operational parameters and spatial security keys</p>
                    </div>
                    {selectedSessionId && (
                      <button 
                        onClick={() => handleDeleteSession(selectedSessionId)}
                        className="px-8 py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-3 border border-rose-100 shadow-sm group/del"
                      >
                        <Trash2 size={16} className="group-hover/del:rotate-12 transition-transform" /> Decommission Node
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSessionSubmit} className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] ml-2 flex items-center gap-2">
                             <Fingerprint size={14} className="text-indigo-500" /> Administrative Identifier
                          </label>
                          <input 
                             required
                             type="text" 
                             value={sessionFormData.name}
                             onChange={(e) => setSessionFormData({...sessionFormData, name: e.target.value})}
                             placeholder="e.g. CORE-ACCESS-ALPHA"
                             className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] py-5 px-8 font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm"
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] ml-2 flex items-center gap-2">
                             <MapPin size={14} className="text-indigo-500" /> Spatial Coordinates Label
                          </label>
                          <input 
                             required
                             type="text" 
                             value={sessionFormData.locationName}
                             onChange={(e) => setSessionFormData({...sessionFormData, locationName: e.target.value})}
                             placeholder="e.g. Sector-4 Command Center"
                             className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] py-5 px-8 font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm"
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] ml-2 flex items-center gap-2">
                             <Navigation size={14} className="text-indigo-500" /> Latitude Vector
                          </label>
                          <input 
                             required
                             type="number" 
                             step="0.000001"
                             value={sessionFormData.lat}
                             onChange={(e) => setSessionFormData({...sessionFormData, lat: parseFloat(e.target.value)})}
                             className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] py-5 px-8 font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] ml-2 flex items-center gap-2">
                             <Navigation size={14} className="text-indigo-500 rotate-90" /> Longitude Vector
                          </label>
                          <input 
                             required
                             type="number" 
                             step="0.000001"
                             value={sessionFormData.lng}
                             onChange={(e) => setSessionFormData({...sessionFormData, lng: parseFloat(e.target.value)})}
                             className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] py-5 px-8 font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                          />
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center mb-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] ml-2 flex items-center gap-2">
                                <Maximize size={14} className="text-indigo-500" /> Security Radius
                             </label>
                             <span className="text-indigo-600 font-bold text-[10px] uppercase bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 shadow-sm">{sessionFormData.radius}m Bounds</span>
                          </div>
                          <input 
                             type="range" 
                             min="20" 
                             max="1000" 
                             step="10"
                             value={sessionFormData.radius}
                             onChange={(e) => setSessionFormData({...sessionFormData, radius: parseInt(e.target.value)})}
                             className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                       </div>
                    </div>

                    <div className="space-y-8">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] ml-2 flex items-center gap-2">
                          <Users size={14} className="text-indigo-500" /> Deployment Context (Filter Years)
                       </label>
                       <div className="flex flex-wrap gap-4 p-8 bg-slate-50/50 border border-slate-100 rounded-[2.5rem]">
                          {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni'].map(year => (
                            <button
                              key={year}
                              type="button"
                              onClick={() => {
                                const eligibleYears = sessionFormData.eligibleYears || [];
                                const newYears = eligibleYears.includes(year)
                                  ? eligibleYears.filter(y => y !== year)
                                  : [...eligibleYears, year];
                                setSessionFormData({ ...sessionFormData, eligibleYears: newYears });
                              }}
                              className={`px-8 py-3.5 rounded-[1.25rem] text-[10px] font-bold uppercase tracking-widest transition-all border shadow-sm ${
                                (sessionFormData.eligibleYears || []).includes(year) 
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-xl active:scale-95' 
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                              }`}
                            >
                              {year}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-8">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] ml-2 flex items-center gap-2">
                          <Layers size={14} className="text-indigo-500" /> Target Department Cluster
                       </label>
                       <div className="flex flex-wrap gap-4 p-8 bg-slate-50/50 border border-slate-100 rounded-[2.5rem]">
                          {['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS', 'ACT'].map(dept => (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => {
                                const eligibleDepts = sessionFormData.eligibleDepartments || [];
                                const newDepts = eligibleDepts.includes(dept)
                                  ? eligibleDepts.filter(d => d !== dept)
                                  : [...eligibleDepts, dept];
                                setSessionFormData({ ...sessionFormData, eligibleDepartments: newDepts });
                              }}
                              className={`px-8 py-3.5 rounded-[1.25rem] text-[10px] font-bold uppercase tracking-widest transition-all border shadow-sm ${
                                (sessionFormData.eligibleDepartments || []).includes(dept) 
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20 active:scale-95' 
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                              }`}
                            >
                              {dept}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="pt-10 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-8">
                        <button 
                           type="submit" 
                           disabled={isSaving}
                           className="w-full sm:w-auto px-16 py-5 bg-indigo-600 text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
                        >
                           {isSaving ? (
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                           ) : (
                              <>
                                 <Save size={18} /> Commit Protocol
                              </>
                           )}
                        </button>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                           <ShieldCheck size={16} className="text-indigo-500 opacity-70" /> Encryption Enforced: 256-bit AES
                        </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Manual Status Overlay - Premium */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-12 w-full max-w-lg shadow-2xl animate-in zoom-in-95 border border-slate-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 -z-10 blur-xl opacity-50"></div>
             
             <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-indigo-600 rounded-[1.75rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30">
                  <Shield size={36} />
                </div>
                <div>
                  <h3 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Manual Override</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em] mt-1">Cryptographic Verification System</p>
                </div>
             </div>

             <div className="flex gap-6 mb-12">
                <button 
                  onClick={() => setEditingStatus("present")} 
                  className={`flex-1 py-10 rounded-[2.5rem] border-2 flex flex-col items-center gap-5 transition-all duration-500 ${
                    editingStatus === 'present' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-[12px] ring-emerald-500/5 shadow-xl' : 'border-slate-50 text-slate-300 hover:border-slate-100'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${editingStatus === 'present' ? 'bg-emerald-500 text-white rotate-12 scale-110' : 'bg-slate-50 text-slate-200'}`}>
                    <CheckCircle2 size={28} /> 
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Verified</span>
                </button>
                <button 
                  onClick={() => setEditingStatus("absent")} 
                  className={`flex-1 py-10 rounded-[2.5rem] border-2 flex flex-col items-center gap-5 transition-all duration-500 ${
                    editingStatus === 'absent' ? 'border-rose-500 bg-rose-50 text-rose-700 ring-[12px] ring-rose-500/5 shadow-xl' : 'border-slate-50 text-slate-300 hover:border-slate-100'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${editingStatus === 'absent' ? 'bg-rose-500 text-white rotate-12 scale-110' : 'bg-slate-50 text-slate-200'}`}>
                    <XCircle size={28} /> 
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Missing</span>
                </button>
             </div>

             <div className="flex gap-4">
                <button 
                  onClick={() => setEditingStudent(null)} 
                  className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
                >
                  Abort Access
                </button>
                <button 
                  onClick={() => updateAttendance(editingStudent, editingStatus)} 
                  className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-1 transition-all active:translate-y-0"
                >
                  Commit Entry
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Create User Modal - Premium */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 border border-slate-100 relative overflow-hidden overflow-y-auto max-h-[90vh]">
             <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full -mr-24 -mt-24 -z-10 blur-2xl opacity-60"></div>
             
             <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-indigo-600 rounded-[1.75rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30">
                  <UserPlus size={36} />
                </div>
                <div>
                  <h3 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Deployment Phase</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em] mt-1">Registering new node in registry matrix</p>
                </div>
             </div>
             
             <form onSubmit={handleCreateUser} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Display Name</label>
                    <input 
                      required
                      type="text" 
                      value={newUserFormData.name}
                      onChange={(e) => setNewUserFormData({...newUserFormData, name: e.target.value})}
                      placeholder="e.g. Alex Rivera"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Identity Hash (Roll No)</label>
                    <input 
                      required
                      type="text" 
                      value={newUserFormData.rollNo}
                      onChange={(e) => setNewUserFormData({...newUserFormData, rollNo: e.target.value})}
                      placeholder="e.g. 21CS042"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Electronic Mail Address</label>
                  <input 
                    required
                    type="email" 
                    value={newUserFormData.email}
                    onChange={(e) => setNewUserFormData({...newUserFormData, email: e.target.value})}
                    placeholder="alex.rivera@institution.edu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Cluster (Dept)</label>
                    <select 
                      value={newUserFormData.department}
                      onChange={(e) => setNewUserFormData({...newUserFormData, department: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm appearance-none"
                    >
                      {['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS', 'ACT'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Deployment Year</label>
                    <select 
                      value={newUserFormData.year}
                      onChange={(e) => setNewUserFormData({...newUserFormData, year: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm appearance-none"
                    >
                      {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni'].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-8 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)} 
                    className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50"
                  >
                    {isSaving ? "Synchronizing..." : "Initialize Record"}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl animate-in zoom-in-95 border border-slate-100 relative overflow-hidden flex flex-col max-h-[92vh]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 -z-0 blur-3xl opacity-60" />

            {/* Modal Header */}
            <div className="p-8 sm:p-10 flex items-center justify-between border-b border-slate-100 relative z-10 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Bulk User Upload</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em] mt-1">Import registry nodes from CSV</p>
                </div>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {bulkResult ? (
                /* Result View */
                <div className="p-8 sm:p-10 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 text-center">
                      <p className="text-4xl font-heading font-bold text-emerald-600">{bulkResult.created.length}</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Created</p>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-center">
                      <p className="text-4xl font-heading font-bold text-rose-500">{bulkResult.skipped.length}</p>
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1">Skipped</p>
                    </div>
                  </div>

                  {bulkResult.skipped.length > 0 && (
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Skipped Records</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {bulkResult.skipped.map((s, i) => (
                          <div key={i} className="flex justify-between text-xs font-medium text-slate-600">
                            <span className="font-bold">{s.rollNo || "â€”"}</span>
                            <span className="text-rose-400">{s.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button onClick={() => { setBulkResult(null); setBulkPreview([]); setBulkRawText(""); }} className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors">Upload More</button>
                    <button onClick={() => setIsBulkModalOpen(false)} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all">Close</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBulkSubmit} className="p-8 sm:p-10 space-y-8">
                  {/* Step 1: Common Fields */}
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.3em] mb-4">Step 1 â€” Set Common Fields</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Class Label</label>
                        <input required type="text" placeholder="e.g. CSE-A" value={bulkCommon.className}
                          onChange={e => setBulkCommon({...bulkCommon, className: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 font-bold text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Department</label>
                        <select required value={bulkCommon.department} onChange={e => setBulkCommon({...bulkCommon, department: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 font-bold text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none">
                          {['CSE','IT','ECE','EEE','MECH','CIVIL','AI&DS','ACT'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Year</label>
                        <select required value={bulkCommon.year} onChange={e => setBulkCommon({...bulkCommon, year: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 font-bold text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none">
                          {['1st Year','2nd Year','3rd Year','4th Year','Alumni'].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Common Password</label>
                        <input required type="password" placeholder="Min 6 chars" value={bulkCommon.password}
                          onChange={e => setBulkCommon({...bulkCommon, password: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 font-bold text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: CSV Input */}
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.3em] mb-4">Step 2 â€” Upload Excel Sheet or Paste Data <span className="text-slate-400 normal-case tracking-normal font-medium">(Columns: Roll No, Name)</span></p>
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-indigo-400 mb-2 transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <p className="text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">Click to upload Excel (.xlsx, .xls)</p>
                      <input type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={handleBulkFileUpload} />
                    </label>
                    <div className="relative mt-4">
                      <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">â€” or paste below â€”</p>
                      <textarea
                        rows={5}
                        value={bulkRawText}
                        onChange={e => { setBulkRawText(e.target.value); setBulkPreview(parseBulkText(e.target.value)); }}
                        placeholder={"21CS001, John Doe\n21CS002, Jane Smith\n21CS003, Alex Kumar"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-mono text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Step 3: Preview */}
                  {bulkPreview.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.3em]">Step 3 â€” Preview</p>
                        <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold rounded-xl">{bulkPreview.length} records</span>
                      </div>
                      <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden max-h-52 overflow-y-auto">
                        <table className="w-full text-left">
                          <thead className="bg-white border-b border-slate-100 sticky top-0">
                            <tr>
                              <th className="px-5 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">#</th>
                              <th className="px-5 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Roll No</th>
                              <th className="px-5 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bulkPreview.map((u, i) => (
                              <tr key={i} className={!u.rollNo || !u.name ? 'bg-rose-50' : ''}>
                                <td className="px-5 py-3 text-xs text-slate-400 font-bold">{i + 1}</td>
                                <td className="px-5 py-3 text-xs font-bold text-slate-700">{u.rollNo || <span className="text-rose-400">Missing</span>}</td>
                                <td className="px-5 py-3 text-xs text-slate-600">{u.name || <span className="text-rose-400">Missing</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-4 pt-2">
                    <button type="button" onClick={() => setIsBulkModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors">Cancel</button>
                    <button type="submit" disabled={isBulkSaving || bulkPreview.length === 0} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {isBulkSaving ? "Uploading..." : `Upload ${bulkPreview.length} Users`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out; }
        .zoom-in-95 { animation: zoom-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      ` }} />
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative ${
      active 
        ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 translate-x-1' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <div className={`transition-all duration-500 ${active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400 group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className="text-xs font-bold uppercase tracking-widest leading-none">{label}</span>
    {badge && (
      <span className={`ml-auto px-2.5 py-1 text-[9px] font-bold rounded-lg min-w-[22px] h-5 flex items-center justify-center ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-indigo-400'}`}>
        {badge}
      </span>
    )}
  </button>
);

const MetricCard = ({ label, value, icon, trend, isUp, color }) => {
  const colorMap = {
    indigo: 'from-indigo-600 to-blue-600 shadow-indigo-500/20',
    emerald: 'from-emerald-600 to-teal-600 shadow-emerald-500/20',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/20',
    blue: 'from-blue-500 to-cyan-500 shadow-blue-500/20',
    rose: 'from-rose-500 to-red-500 shadow-rose-500/20',
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] hover:-translate-y-2 transition-all duration-500 group flex flex-col h-full min-h-[180px] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700 -z-0" />
      
      <div className="flex justify-between items-start relative z-10 mb-8">
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorMap[color] || colorMap.indigo} text-white shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} rounded-xl text-[10px] font-bold uppercase tracking-widest border ${isUp ? 'border-emerald-100' : 'border-rose-100 shadow-sm'}`}>
          <Activity size={12} className={isUp ? '' : 'rotate-180'} />
          {trend}
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 opacity-80">{label}</p>
        <p className="text-4xl font-heading font-bold text-slate-900 tracking-tighter group-hover:text-indigo-600 transition-colors">{value}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
