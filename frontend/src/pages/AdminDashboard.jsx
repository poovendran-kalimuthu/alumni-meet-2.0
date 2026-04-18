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
  Copy, ExternalLink, Shield, Layers, Command, Save
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";

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
      
      {/* Sidebar - Modernized Light Theme */}
      <aside className="w-72 bg-white border-r border-slate-200 hidden lg:flex flex-col relative shrink-0">
        <div className="p-8 flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-primary font-bold tracking-tight text-slate-800">SPECTRUM</h1>
            <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-[0.2em]">Attendance OS</p>
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="px-4 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Menu</p>
          <nav className="space-y-1">
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Overview" active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setSelectedSessionId(null); }} />
            <SidebarItem icon={<Layers size={20} />} label="Sessions" active={activeTab === "sessions"} onClick={() => { setActiveTab("sessions"); setSelectedSessionId(null); }} badge="12" />
            <SidebarItem icon={<Users size={20} />} label="Registry" active={false} onClick={() => {}} />
            <SidebarItem icon={<Activity size={20} />} label="Analytics" active={false} onClick={() => {}} />
          </nav>

          {selectedSessionId && (
            <div className="mt-8">
              <p className="px-4 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Workspace</p>
              <nav className="space-y-1">
                <SidebarItem icon={<Users size={20} />} label="Session Registry" active={activeTab === "session-detail" && workspaceTab === "registry"} onClick={() => { setActiveTab("session-detail"); setWorkspaceTab("registry"); }} />
                <SidebarItem icon={<Settings size={20} />} label="Workspace Settings" active={activeTab === "session-detail" && workspaceTab === "settings"} onClick={() => { setActiveTab("session-detail"); setWorkspaceTab("settings"); }} />
              </nav>
            </div>
          )}
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              A
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">Administrator</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">admin@spectrum.tech</p>
            </div>
            <button className="text-slate-400 hover:text-rose-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F8FAFC]">
        {/* Header - Personalized & Clean */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-10 py-6 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
              <span>Admin Dashboard</span>
              {selectedSessionId && (
                <>
                  <ChevronRight size={12} />
                  <span className="text-indigo-600">{selectedSession?.name}</span>
                </>
              )}
            </div>
            <h2 className="text-2xl font-primary font-bold text-slate-800">
              Good Morning, {localStorage.getItem("admin_email")?.split('@')[0] || "Jonathan"}!
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Here's what's happening with spectrum today</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold">
              <Calendar size={14} className="text-indigo-600" />
              {currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            
            <button 
              onClick={() => { loadUsers(); loadSessions(); }} 
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all hover:shadow-md"
            >
              <RefreshCcw size={18} className={sessionsLoading ? "animate-spin" : ""} />
            </button>

            {activeTab === "session-detail" && (
              <button 
                onClick={exportToPDF} 
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Download size={14} /> Export PDF
              </button>
            )}
          </div>
        </header>

        <main className="p-8 max-w-[1400px] mx-auto w-full space-y-8">
          
          {/* View: Overview (Global) - Reference Style */}
          {activeTab === "overview" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                  label="Total Students" 
                  value={students.length} 
                  icon={<Users className="w-5 h-5" />} 
                  trend="+2.5%" 
                  isUp={true} 
                  color="indigo" 
                />
                <MetricCard 
                  label="Verified Events" 
                  value={sessions.length} 
                  icon={<CheckCircle2 className="w-5 h-5" />} 
                  trend="+1.2%" 
                  isUp={true} 
                  color="emerald" 
                />
                <MetricCard 
                  label="Live Sessions" 
                  value={sessions.filter(s => s.isAttendanceEnabled).length} 
                  icon={<Activity className="w-5 h-5" />} 
                  trend="-0.5%" 
                  isUp={false} 
                  color="amber" 
                />
                <MetricCard 
                  label="Pending Records" 
                  value="1.2k" 
                  icon={<Clock className="w-5 h-5" />} 
                  trend="+4.3%" 
                  isUp={true} 
                  color="blue" 
                />
              </div>

              {/* Attendance Report & Growth Section */}
              <div className="flex flex-col xl:flex-row gap-8">
                <div className="flex-1 bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Institutional Report</h3>
                    <div className="flex items-baseline gap-4 mb-8">
                      <span className="text-5xl font-primary font-bold text-slate-800 tracking-tighter">94.2%</span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1">
                        <Activity size={12} /> +2.5% vs last month
                      </span>
                    </div>

                    <div style={{ height: 300, width: '100%' }} className="mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                            cursor={{ stroke: '#4F46E5', strokeWidth: 2, strokeDasharray: '5 5' }}
                          />
                          <Area type="monotone" dataKey="present" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="w-full xl:w-80 space-y-6">
                  <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-xl shadow-indigo-900/20 h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                    <div className="relative z-10 flex flex-col h-full">
                      <h4 className="text-xl font-primary font-bold mb-4">Congratulations!</h4>
                      <p className="text-indigo-200 text-sm font-medium leading-relaxed mb-8">
                        Your institution has achieved a 95% attendance yield this week. Great performance!
                      </p>
                      <button className="mt-auto w-full py-4 bg-white text-indigo-900 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg">
                        View Detailed Stats
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Active Sessions Component */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8 px-2">
                  <h3 className="text-xl font-primary font-bold text-slate-800">Quick-Switch Workspace</h3>
                  <button onClick={() => setActiveTab("sessions")} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">View Gallery</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sessions.slice(0, 6).map(session => (
                    <div 
                      key={session._id} 
                      onClick={() => { setSelectedSessionId(session._id); setActiveTab("session-detail"); setWorkspaceTab("registry"); }}
                      className="cursor-pointer p-6 bg-slate-50 hover:bg-white hover:shadow-xl hover:-translate-y-1 border border-slate-100 transition-all rounded-[2rem] group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Layers size={18} />
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${session.isAttendanceEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                          {session.isAttendanceEnabled ? 'Active' : 'Offline'}
                        </span>
                      </div>
                      <h4 className="font-primary font-bold text-slate-800 truncate mb-1">{session.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{session.locationName}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View: Sessions Gallery - Reference Style */}
          {activeTab === "sessions" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                 <div>
                   <h3 className="text-3xl font-primary font-bold text-slate-800 tracking-tighter">Sessions Gallery</h3>
                   <p className="text-slate-500 text-sm font-medium mt-1">Manage institutional verification events and geo-fenced workspaces</p>
                 </div>
                 <button 
                    onClick={() => {
                      setSelectedSessionId(null);
                      setSessionFormData({
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
                      setActiveTab("session-detail");
                      setWorkspaceTab("settings");
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-[1.25rem] text-sm font-bold shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group active:scale-95"
                 >
                   <Command size={18} className="group-hover:rotate-12 transition-transform" /> New Session
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                 {sessions.map(session => (
                   <div key={session._id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group relative overflow-hidden flex flex-col h-full">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100 transition-colors"></div>
                     <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border ${session.isAttendanceEnabled ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          <Layers size={24} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <span className={`w-2 h-2 rounded-full ${session.isAttendanceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{session.isAttendanceEnabled ? 'Active' : 'Offline'}</span>
                        </div>
                     </div>
                     
                     <div className="relative z-10 flex-1 mb-8">
                       <h4 className="text-xl font-primary font-bold text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors">{session.name}</h4>
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                         <MapPin size={14} className="text-indigo-600" /> {session.locationName}
                       </p>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                       <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Schedule</p>
                         <p className="text-xs font-bold text-slate-700 truncate">{session.dateTime}</p>
                       </div>
                       <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Geo-Fence</p>
                         <p className="text-xs font-bold text-slate-700">{session.radius}m Radius</p>
                       </div>
                     </div>

                     <div className="flex gap-3 relative z-10">
                       <button 
                         onClick={() => { setSelectedSessionId(session._id); setActiveTab("session-detail"); setWorkspaceTab("registry"); }}
                         className="flex-1 py-4 bg-slate-900 text-white rounded-[1.25rem] text-xs font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                       >
                         Open Workspace
                       </button>
                       <button 
                         onClick={() => copySessionLink(session._id)}
                         className="p-4 bg-white border border-slate-200 rounded-[1.25rem] text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm group/btn"
                         title="Copy Link"
                       >
                         <Copy size={18} className="group-hover/btn:scale-110 transition-transform" />
                       </button>
                       <button 
                          onClick={() => toggleSessionStatus(session)}
                          className={`p-4 rounded-[1.25rem] border transition-all shadow-sm ${session.isAttendanceEnabled ? 'border-rose-100 text-rose-500 bg-rose-50/30 hover:bg-rose-50' : 'border-emerald-100 text-emerald-500 bg-emerald-50/30 hover:bg-emerald-50'}`}
                       >
                         {session.isAttendanceEnabled ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                       </button>
                     </div>
                   </div>
                 ))}
                 
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
            </div>
          )}

          {/* View: Session Workspace (Drill-down) */}
          {activeTab === "session-detail" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              
              {/* Workspace Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard 
                  label="Total Expected" 
                  value={stats.total} 
                  icon={<Users className="w-5 h-5" />} 
                  trend="Registry" 
                  isUp={true} 
                  color="indigo" 
                />
                <MetricCard 
                  label="Verified Present" 
                  value={stats.present} 
                  icon={<CheckCircle2 className="w-5 h-5" />} 
                  trend="Live" 
                  isUp={true} 
                  color="emerald" 
                />
                <MetricCard 
                  label="Pending Attendance" 
                  value={stats.absent} 
                  icon={<XCircle className="w-5 h-5" />} 
                  trend="Required" 
                  isUp={false} 
                  color="rose" 
                />
                <MetricCard 
                  label="Attendance Yield" 
                  value={`${stats.rate}%`} 
                  icon={<Activity className="w-5 h-5" />} 
                  trend="Stable" 
                  isUp={true} 
                  color="blue" 
                />
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2 w-fit">
                <button 
                  onClick={() => setWorkspaceTab("registry")}
                  className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${workspaceTab === 'registry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Users size={14} /> Attendance Registry
                </button>
                <button 
                  onClick={() => setWorkspaceTab("settings")}
                  className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${workspaceTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Settings size={14} /> Workspace Settings
                </button>
                {selectedSessionId && (
                  <button 
                    onClick={() => copySessionLink(selectedSessionId)}
                    className="px-8 py-2.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all flex items-center gap-2"
                  >
                    <Copy size={14} /> Copy Public Link
                  </button>
                )}
              </div>

               {/* Workspace Content: Registry - Enhanced Table */}
              {workspaceTab === "registry" && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                  <div className="p-10 border-b border-slate-100 bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div>
                      <h3 className="text-xl font-primary font-bold text-slate-800 mb-1">Last Transactions</h3>
                      <p className="text-xs text-slate-400 font-medium">Real-time attendance ingestion logs</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                      <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Search records..." 
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      
                      <button className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto px-6 mb-6">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                      <thead>
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity Index</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(student => {
                          const attendance = getAttendanceForUser(student._id);
                          const isPresent = !!attendance;
                          return (
                            <tr key={student._id} className="group hover:translate-x-1 transition-transform">
                              <td className="bg-white group-hover:bg-slate-50/50 px-6 py-4 border-y border-l border-slate-100 first:rounded-l-2xl transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 shadow-sm border border-indigo-100/50">
                                    {student.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{student.className}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="bg-white group-hover:bg-slate-50/50 px-6 py-4 border-y border-slate-100 transition-colors">
                                <span className="font-mono text-xs font-bold text-indigo-500">#{student.rollNo}</span>
                              </td>
                              <td className="bg-white group-hover:bg-slate-50/50 px-6 py-4 border-y border-slate-100 transition-colors">
                                <span className="text-xs font-bold text-slate-600">{student.department}</span>
                              </td>
                              <td className="bg-white group-hover:bg-slate-50/50 px-6 py-4 border-y border-slate-100 transition-colors">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${isPresent ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isPresent ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isPresent ? 'Verified' : 'Pending'}
                                  </span>
                                </div>
                              </td>
                              <td className="bg-white group-hover:bg-slate-50/50 px-6 py-4 border-y border-r border-slate-100 last:rounded-r-2xl text-right transition-colors">
                                <button 
                                  onClick={() => { setEditingStudent(student._id); setEditingStatus(isPresent ? "present" : "absent"); }}
                                  className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent"
                                >
                                  <ExternalLink size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredStudents.length === 0 && (
                    <div className="py-24 text-center">
                      <Search className="mx-auto text-slate-200 w-12 h-12 mb-6" />
                      <p className="text-slate-400 font-bold text-lg">No records found</p>
                      <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search keywords</p>
                    </div>
                  )}
                </div>
              )}

              {/* Workspace Content: Settings - Modernized */}
              {workspaceTab === "settings" && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-12 shadow-sm animate-in fade-in duration-300">
                  <div className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                      <h3 className="text-3xl font-primary font-bold text-slate-800 tracking-tighter flex items-center gap-4">
                         <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner border border-indigo-100">
                            <Settings size={32} />
                         </div>
                         Session Protocol
                      </h3>
                      <p className="text-slate-500 mt-2 text-sm font-medium">Configure operational parameters and geofencing credentials</p>
                    </div>
                    {selectedSessionId && (
                      <button 
                        onClick={() => handleDeleteSession(selectedSessionId)}
                        className="px-8 py-4 bg-rose-50 text-rose-600 rounded-[1.25rem] text-xs font-bold hover:bg-rose-600 hover:text-white transition-all flex items-center gap-3 border border-rose-100 shadow-sm"
                      >
                        <XCircle size={18} /> Delete Workspace
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSessionSubmit} className="space-y-12">
                    <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 flex flex-col sm:flex-row items-center justify-between group transition-all hover:border-indigo-100 gap-6">
                      <div className="flex items-center gap-6 text-center sm:text-left">
                          <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-3xl transition-all shadow-lg ${sessionFormData.isAttendanceEnabled ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-200 text-slate-500 shadow-slate-500/10'}`}>
                            {sessionFormData.isAttendanceEnabled ? <Activity size={32} /> : <XCircle size={32} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-xl text-slate-800 tracking-tight">System Status</h4>
                            <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-0.5">
                              {sessionFormData.isAttendanceEnabled ? 'Accepting Sign-ins' : 'Verification Secured'}
                            </p>
                          </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSessionFormData({...sessionFormData, isAttendanceEnabled: !sessionFormData.isAttendanceEnabled})}
                        className={`w-20 h-10 rounded-full relative transition-all shadow-inner border-2 ${sessionFormData.isAttendanceEnabled ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-300 border-slate-400'}`}
                      >
                        <div className={`absolute top-0.5 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${sessionFormData.isAttendanceEnabled ? 'left-10 text-indigo-600' : 'left-0.5 text-slate-400'}`}>
                          <Layers size={14} />
                        </div>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                             <Command size={14} className="text-indigo-500" /> Administrative Identity
                          </label>
                          <input 
                             required
                             type="text" 
                             value={sessionFormData.name}
                             onChange={(e) => setSessionFormData({...sessionFormData, name: e.target.value})}
                             placeholder="e.g. Annual Symposium 2024"
                             className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-5 px-8 font-bold text-slate-800 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:font-medium placeholder:text-slate-400"
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                             <MapPin size={14} className="text-indigo-500" /> Physical Deployment Venue
                          </label>
                          <input 
                             required
                             type="text" 
                             value={sessionFormData.locationName}
                             onChange={(e) => setSessionFormData({...sessionFormData, locationName: e.target.value})}
                             placeholder="e.g. Grand Ballroom, Sector 7"
                             className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-5 px-8 font-bold text-slate-800 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:font-medium placeholder:text-slate-400"
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                             <Calendar size={14} className="text-indigo-500" /> Event Scheduling
                          </label>
                          <div className="relative">
                            <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                               required
                               type="text" 
                               value={sessionFormData.dateTime}
                               onChange={(e) => setSessionFormData({...sessionFormData, dateTime: e.target.value})}
                               placeholder="e.g. Next Monday, 09:30 AM"
                               className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-5 pl-16 pr-8 font-bold text-slate-800 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:font-medium placeholder:text-slate-400"
                            />
                          </div>
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center mb-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <Activity size={14} className="text-indigo-500" /> Geo-Fence Radius
                             </label>
                             <span className="text-indigo-600 font-bold text-xs bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 shadow-sm">{sessionFormData.radius}m Bounds</span>
                          </div>
                          <div className="px-4 py-6 bg-slate-50 border border-slate-100 rounded-[1.25rem] space-y-4">
                            <input 
                               type="range" 
                               min="20" 
                               max="1000" 
                               step="10"
                               value={sessionFormData.radius}
                               onChange={(e) => setSessionFormData({...sessionFormData, radius: parseInt(e.target.value)})}
                               className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                               <span>Precision (20m)</span>
                               <span className="text-indigo-600">Optimal (200m)</span>
                               <span>Macro (1km)</span>
                            </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                           <Users size={14} className="text-indigo-500" /> Access Requirements (Years)
                        </label>
                        <div className="flex flex-wrap gap-4 p-8 bg-slate-50/30 border border-slate-100 rounded-[2.5rem]">
                           {(availableYears.length > 0 ? availableYears : ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni']).map(year => (
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
                               className={`px-8 py-3.5 rounded-[1.25rem] text-xs font-bold transition-all border shadow-sm ${
                                 sessionFormData.eligibleYears.includes(year) 
                                   ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20 active:scale-95' 
                                   : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                               }`}
                             >
                               {year}
                             </button>
                           ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                           <Layers size={14} className="text-indigo-500" /> Eligible Departments
                        </label>
                        <div className="flex flex-wrap gap-4 p-8 bg-slate-50/30 border border-slate-100 rounded-[2.5rem]">
                           {(availableDepts.length > 0 ? availableDepts : ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS', 'ACT']).map(dept => (
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
                               className={`px-8 py-3.5 rounded-[1.25rem] text-xs font-bold transition-all border shadow-sm ${
                                 sessionFormData.eligibleDepartments.includes(dept) 
                                   ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20 active:scale-95' 
                                   : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                               }`}
                             >
                               {dept}
                             </button>
                           ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                             <MapPin size={14} className="text-indigo-500" /> Latitudinal Base
                          </label>
                          <input 
                             required
                             type="number" 
                             step="0.000001"
                             value={sessionFormData.lat}
                             onChange={(e) => setSessionFormData({...sessionFormData, lat: parseFloat(e.target.value)})}
                             className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-5 px-8 font-bold text-slate-800 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all shadow-sm"
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                             <MapPin size={14} className="text-indigo-500" /> Longitudinal Base
                          </label>
                          <input 
                             required
                             type="number" 
                             step="0.000001"
                             value={sessionFormData.lng}
                             onChange={(e) => setSessionFormData({...sessionFormData, lng: parseFloat(e.target.value)})}
                             className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-5 px-8 font-bold text-slate-800 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all shadow-sm"
                          />
                       </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex items-center justify-between gap-6 flex-col sm:flex-row">
                       <button 
                          type="submit" 
                          disabled={isSaving}
                          className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-bold text-sm flex items-center justify-center gap-3 hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                       >
                          {isSaving ? (
                             <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : (
                             <>
                                <Save size={20} /> Commit Protocol Changes
                             </>
                          )}
                       </button>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                          <Shield size={14} className="text-indigo-400" /> Operational Integrity Enforced
                       </p>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Manual Status Overlay - Modernized */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-slate-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 -z-10"></div>
             
             <div className="flex items-center gap-5 mb-10">
                <div className="w-16 h-16 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                  <Shield size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-primary font-bold text-slate-800 tracking-tight">Manual Override</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Cryptographic Verification</p>
                </div>
             </div>

             <div className="flex gap-4 mb-10">
                <button 
                  onClick={() => setEditingStatus("present")} 
                  className={`flex-1 py-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${
                    editingStatus === 'present' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-8 ring-emerald-500/5' : 'border-slate-50 text-slate-300 hover:border-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${editingStatus === 'present' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-200'}`}>
                    <CheckCircle2 size={24} /> 
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Present</span>
                </button>
                <button 
                  onClick={() => setEditingStatus("absent")} 
                  className={`flex-1 py-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${
                    editingStatus === 'absent' ? 'border-rose-500 bg-rose-50 text-rose-700 ring-8 ring-rose-500/5' : 'border-slate-50 text-slate-300 hover:border-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${editingStatus === 'absent' ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-200'}`}>
                    <XCircle size={24} /> 
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Absent</span>
                </button>
             </div>

             <div className="flex gap-3">
                <button onClick={() => setEditingStudent(null)} className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-[1.25rem] font-bold text-xs hover:bg-slate-100 transition-colors">Abort Access</button>
                <button onClick={() => updateAttendance(editingStudent, editingStatus)} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[1.25rem] font-bold text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:translate-y-0">Commit Verification</button>
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
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-[1.25rem] transition-all group relative ${
      active 
        ? 'bg-slate-100 text-indigo-600 shadow-sm' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`}
  >
    <div className={`transition-colors ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-800'}`}>
      {icon}
    </div>
    <span className="text-sm font-bold tracking-tight">{label}</span>
    {badge && (
      <span className="ml-auto px-2 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center">
        {badge}
      </span>
    )}
    {active && (
      <div className="absolute left-[-1.5px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-600 rounded-r-full shadow-[2px_0_10px_rgba(79,70,229,0.3)]"></div>
    )}
  </button>
);

const MetricCard = ({ label, value, icon, trend, isUp, color }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between h-full min-h-[160px]">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl border ${colorMap[color] || colorMap.indigo} shadow-sm group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} rounded-lg text-xs font-bold border ${isUp ? 'border-emerald-100' : 'border-rose-100'}`}>
          <Activity size={12} className={isUp ? '' : 'rotate-180'} />
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-primary font-bold text-slate-800 tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;