import React, { useEffect, useState, useMemo } from "react";
import { axiosInstance } from "../lib/axios";
import { 
  FiSearch, FiDownload, FiUsers, FiCheckCircle, 
  FiXCircle, FiRefreshCw, FiActivity, FiLayers, FiClock, 
  FiEdit2, FiSave, FiX, FiCommand, FiFileText, FiServer, FiShield,
  FiSettings, FiMapPin, FiToggleRight, FiToggleLeft, FiArrowLeft, FiMoreVertical,
  FiCopy, FiExternalLink
} from "react-icons/fi";
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
    isAttendanceEnabled: true
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    loadUsers();
    loadSessions();
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

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionAttendance(selectedSessionId);
      const session = sessions.find(s => s._id === selectedSessionId);
      if (session) setSessionFormData(session);
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

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const attendance = getAttendanceForUser(s._id);
      const isPresent = !!attendance;
      const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || 
                            s.rollNo?.toString().includes(search);
      const matchesStatus = statusFilter === "all" || (statusFilter === "present" ? isPresent : !isPresent);
      return matchesSearch && matchesStatus;
    });
  }, [students, sessionAttendance, search, statusFilter]);

  const stats = useMemo(() => {
    const total = students.length;
    const present = sessionAttendance.length;
    return { 
      total, 
      present, 
      absent: total - present, 
      rate: total > 0 ? ((present / total) * 100).toFixed(1) : 0 
    };
  }, [students, sessionAttendance]);

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-['Space_Grotesk'] text-indigo-600 font-bold animate-pulse">Loading Infrastructure...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-['Space_Grotesk'] flex overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-72 bg-[#0F172A] p-8 hidden lg:flex flex-col text-white relative shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-12 border-b border-white/5 pb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <FiShield className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SPECTRUM</h1>
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.2em] opacity-80">Admin Workspace</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarLink icon={<FiLayers />} label="Global Overview" active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setSelectedSessionId(null); }} />
          <SidebarLink icon={<FiCommand />} label="Sessions Gallery" active={activeTab === "sessions"} onClick={() => { setActiveTab("sessions"); setSelectedSessionId(null); }} />
          
          {selectedSessionId && (
            <div className="pt-6 mt-6 border-t border-white/5 space-y-2">
              <p className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Active Workspace</p>
              <SidebarLink icon={<FiUsers />} label="Session Registry" active={activeTab === "session-detail" && workspaceTab === "registry"} onClick={() => { setActiveTab("session-detail"); setWorkspaceTab("registry"); }} />
              <SidebarLink icon={<FiSettings />} label="Session Settings" active={activeTab === "session-detail" && workspaceTab === "settings"} onClick={() => { setActiveTab("session-detail"); setWorkspaceTab("settings"); }} />
            </div>
          )}
        </nav>

        <div className="mt-auto p-5 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[10px] text-indigo-300 mb-2 font-bold uppercase">System Time</p>
          <p className="text-xl font-bold font-mono tracking-tighter">
            {currentTime.toLocaleTimeString([], { hour12: false })}
          </p>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F8FAFC]">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {selectedSessionId && (
               <button 
                onClick={() => { setSelectedSessionId(null); setActiveTab("sessions"); }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
               >
                 <FiArrowLeft size={20} />
               </button>
             )}
             <div>
               <h2 className="text-sm font-semibold text-slate-400">
                 {selectedSessionId ? `Workspace / ${selectedSession?.name}` : activeTab === "overview" ? "Dashboard / Overview" : "Dashboard / Gallery"}
               </h2>
               {selectedSessionId && <p className="text-lg font-bold text-slate-800">{selectedSession?.locationName}</p>}
             </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "session-detail" && (
              <button 
                onClick={exportToPDF} 
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
              >
                <FiDownload /> Export PDF
              </button>
            )}
            <button 
              onClick={() => { loadUsers(); loadSessions(); }} 
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            >
              <FiRefreshCw className={sessionsLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <main className="p-8 max-w-[1400px] mx-auto w-full space-y-8">
          
          {/* View: Overview (Global) */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Students" value={students.length} icon={<FiUsers />} trend="Registry" color="bg-indigo-600" />
                <StatCard label="Active Sessions" value={sessions.filter(s => s.isAttendanceEnabled).length} icon={<FiActivity />} trend="Live" color="bg-emerald-500" />
                <StatCard label="Total Saved Events" value={sessions.length} icon={<FiLayers />} trend="Archived" color="bg-amber-500" />
                <StatCard label="Network Latency" value="24ms" icon={<FiServer />} trend="Stable" color="bg-blue-500" />
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Quick Switch Workspace</h3>
                  <button onClick={() => setActiveTab("sessions")} className="text-sm font-bold text-indigo-600 hover:underline">View All Gallery</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.slice(0, 6).map(session => (
                    <div 
                      key={session._id} 
                      onClick={() => { setSelectedSessionId(session._id); setActiveTab("session-detail"); setWorkspaceTab("registry"); }}
                      className="cursor-pointer p-5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 group-hover:text-indigo-600">{session.name}</h4>
                        <span className={`w-2 h-2 rounded-full ${session.isAttendanceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{session.locationName}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View: Sessions Gallery */}
          {activeTab === "sessions" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex justify-between items-center">
                 <div>
                   <h3 className="text-2xl font-bold text-slate-800">Sessions Gallery</h3>
                   <p className="text-slate-500 text-sm font-medium">Select a workspace to manage attendance and configurations</p>
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
                        isAttendanceEnabled: true
                      });
                      setActiveTab("session-detail");
                      setWorkspaceTab("settings");
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                 >
                   <FiCommand /> New Session
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {sessions.map(session => (
                   <div key={session._id} className="bg-white rounded-[2rem] border border-slate-200 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-colors"></div>
                     <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${session.isAttendanceEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                          <FiActivity />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                          <span className={`w-1.5 h-1.5 rounded-full ${session.isAttendanceEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{session.isAttendanceEnabled ? 'Active' : 'Offline'}</span>
                        </div>
                     </div>
                     <h4 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{session.name}</h4>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                       <FiMapPin /> {session.locationName}
                     </p>
                     
                     <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Date Time</p>
                         <p className="text-xs font-bold text-slate-700 truncate">{session.dateTime}</p>
                       </div>
                       <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Perimeter</p>
                         <p className="text-xs font-bold text-slate-700">{session.radius}m Radius</p>
                       </div>
                     </div>

                     <div className="flex gap-3 mt-auto relative z-10">
                       <button 
                         onClick={() => { setSelectedSessionId(session._id); setActiveTab("session-detail"); setWorkspaceTab("registry"); }}
                         className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10 active:scale-95"
                       >
                         Open Workspace
                       </button>
                       <button 
                         onClick={() => copySessionLink(session._id)}
                         className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                         title="Copy Session Link"
                       >
                         <FiCopy />
                       </button>
                       <button 
                          onClick={() => toggleSessionStatus(session)}
                          className={`px-4 py-3 rounded-xl border transition-all ${session.isAttendanceEnabled ? 'border-rose-100 text-rose-500 hover:bg-rose-50' : 'border-emerald-100 text-emerald-500 hover:bg-emerald-50'}`}
                       >
                         {session.isAttendanceEnabled ? <FiXCircle /> : <FiCheckCircle />}
                       </button>
                     </div>
                   </div>
                 ))}
                 
                 {sessions.length === 0 && !sessionsLoading && (
                    <div className="col-span-full py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
                      <FiCommand className="mx-auto text-slate-200 text-5xl mb-6" />
                      <p className="text-slate-500 font-bold text-lg">Your Gallery is Empty</p>
                      <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">Create your first attendance session to begin orchestrating verification events.</p>
                      <button onClick={() => { setActiveTab("session-detail"); setWorkspaceTab("settings"); }} className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20">Initialize Now</button>
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
                <StatCard label="Total Expected" value={stats.total} icon={<FiUsers />} trend="Registry" color="bg-slate-800" />
                <StatCard label="Verified Present" value={stats.present} icon={<FiCheckCircle />} trend="Live" color="bg-emerald-500" />
                <StatCard label="Pending Attendance" value={stats.absent} icon={<FiXCircle />} trend="Action Required" color="bg-rose-500" />
                <StatCard label="Attendance Yield" value={`${stats.rate}%`} icon={<FiActivity />} trend="Stable" color="bg-indigo-600" />
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2 w-fit">
                <button 
                  onClick={() => setWorkspaceTab("registry")}
                  className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${workspaceTab === 'registry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <FiUsers size={14} /> Attendance Registry
                </button>
                <button 
                  onClick={() => setWorkspaceTab("settings")}
                  className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${workspaceTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <FiSettings size={14} /> Session Controls
                </button>
                {selectedSessionId && (
                  <button 
                    onClick={() => copySessionLink(selectedSessionId)}
                    className="px-8 py-2.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all flex items-center gap-2"
                  >
                    <FiCopy size={14} /> Copy Public Link
                  </button>
                )}
              </div>

              {/* Workspace Content: Registry */}
              {workspaceTab === "registry" && (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="relative w-full sm:w-80">
                      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Filter by name or roll no..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter Status:</span>
                      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        {['all', 'present', 'absent'].map(f => (
                          <button 
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === f ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {f === 'all' ? 'Show All' : f === 'present' ? 'Verified' : 'Pending'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/30">
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Student Details</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Roll Index</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Verification</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredStudents.map(student => {
                          const attendance = getAttendanceForUser(student._id);
                          const isPresent = !!attendance;
                          return (
                            <tr key={student._id} className="group hover:bg-slate-50/80 transition-colors">
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 border border-indigo-100/50 group-hover:scale-105 transition-transform">
                                    {student.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-700 text-sm">{student.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{student.className}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <span className="font-mono text-xs font-bold text-indigo-500 bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100/50">{student.rollNo}</span>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 border ${
                                    isPresent ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isPresent ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                    {isPresent ? 'Verified' : 'Pending'}
                                  </span>
                                  {isPresent && attendance.timestamp && (
                                    <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                                      <FiClock className="animate-pulse" /> {new Date(attendance.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <button 
                                  onClick={() => { setEditingStudent(student._id); setEditingStatus(isPresent ? "present" : "absent"); }}
                                  className="p-2.5 hover:bg-white hover:shadow-md hover:text-indigo-600 rounded-xl text-slate-400 transition-all active:scale-90 border border-transparent hover:border-slate-100"
                                >
                                  <FiEdit2 size={16} />
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
                      <FiSearch className="mx-auto text-slate-200 text-5xl mb-6" />
                      <p className="text-slate-400 font-bold text-lg">No match found for "{search}"</p>
                      <p className="text-slate-400 text-sm mt-1">Try refining your search or clearing filters</p>
                    </div>
                  )}
                </div>
              )}

              {/* Workspace Content: Settings */}
              {workspaceTab === "settings" && (
                <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm animate-in fade-in duration-300">
                  <div className="mb-12 flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                         <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                            <FiSettings />
                         </div>
                         Session Workspace Identity
                      </h3>
                      <p className="text-slate-500 mt-2 text-sm font-medium">Fine-tune the operational parameters and geo-fencing for this verification event</p>
                    </div>
                    {selectedSessionId && (
                      <button 
                        onClick={() => handleDeleteSession(selectedSessionId)}
                        className="px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2"
                      >
                        <FiXCircle /> Terminate Session
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSessionSubmit} className="space-y-10">
                    <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 flex items-center justify-between group transition-all hover:border-indigo-100">
                      <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-lg ${sessionFormData.isAttendanceEnabled ? 'bg-emerald-100 text-emerald-600 shadow-emerald-500/10' : 'bg-slate-200 text-slate-500 shadow-slate-500/10'}`}>
                            {sessionFormData.isAttendanceEnabled ? <FiToggleRight /> : <FiToggleLeft />}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-slate-800">Session Verification Logic</h4>
                            <p className="text-xs text-slate-400 font-bold tracking-tight uppercase">Status: {sessionFormData.isAttendanceEnabled ? 'Accepting Sign-ins' : 'Verification Locked'}</p>
                          </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSessionFormData({...sessionFormData, isAttendanceEnabled: !sessionFormData.isAttendanceEnabled})}
                        className={`w-16 h-9 rounded-full relative transition-all shadow-inner ${sessionFormData.isAttendanceEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow-lg transition-all ${sessionFormData.isAttendanceEnabled ? 'left-8' : 'left-1'}`}></div>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <FiFileText className="text-indigo-500" /> Administrative Name
                          </label>
                          <input 
                             required
                             type="text" 
                             value={sessionFormData.name}
                             onChange={(e) => setSessionFormData({...sessionFormData, name: e.target.value})}
                             placeholder="e.g. Alumni Meet - Hall B"
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:font-medium"
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <FiMapPin className="text-indigo-500" /> Physical Venue
                          </label>
                          <input 
                             required
                             type="text" 
                             value={sessionFormData.locationName}
                             onChange={(e) => setSessionFormData({...sessionFormData, locationName: e.target.value})}
                             placeholder="e.g. Main Auditorium"
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:font-medium"
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <FiClock className="text-indigo-500" /> Event Scheduling (Human Readable)
                          </label>
                          <input 
                             required
                             type="text" 
                             value={sessionFormData.dateTime}
                             onChange={(e) => setSessionFormData({...sessionFormData, dateTime: e.target.value})}
                             placeholder="e.g. 10th Aug, 09:30 AM"
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:font-medium"
                          />
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center mb-1">
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FiActivity className="text-indigo-500" /> Geo-Fence Radius
                             </label>
                             <span className="text-indigo-600 font-bold text-xs bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">{sessionFormData.radius} Meters</span>
                          </div>
                          <input 
                             type="range" 
                             min="20" 
                             max="1000" 
                             step="10"
                             value={sessionFormData.radius}
                             onChange={(e) => setSessionFormData({...sessionFormData, radius: parseInt(e.target.value)})}
                             className="w-full h-3 bg-slate-100 rounded-xl appearance-none cursor-pointer accent-indigo-600 transition-all hover:bg-indigo-50"
                          />
                          <div className="flex justify-between text-[10px] font-bold text-slate-300 uppercase tracking-tighter px-1">
                             <span>Precision (20m)</span>
                             <span>Enterprise (200m)</span>
                             <span>Broad (1km)</span>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                       <div className="space-y-4 p-6 bg-slate-50/30 rounded-3xl border border-slate-100">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <FiMapPin className="text-indigo-500" /> Deployment Lat-Axis
                          </label>
                          <input 
                             required
                             type="number" 
                             step="0.000001"
                             value={sessionFormData.lat}
                             onChange={(e) => setSessionFormData({...sessionFormData, lat: parseFloat(e.target.value)})}
                             className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                          />
                       </div>
                       <div className="space-y-4 p-6 bg-slate-50/30 rounded-3xl border border-slate-100">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <FiMapPin className="text-indigo-500" /> Deployment Lng-Axis
                          </label>
                          <input 
                             required
                             type="number" 
                             step="0.000001"
                             value={sessionFormData.lng}
                             onChange={(e) => setSessionFormData({...sessionFormData, lng: parseFloat(e.target.value)})}
                             className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                          />
                       </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex items-center gap-4">
                       <button 
                          type="submit" 
                          disabled={isSaving}
                          className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                       >
                          {isSaving ? (
                             <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : (
                             <>
                                <FiSave /> Commit Workspace Changes
                             </>
                          )}
                       </button>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic group-hover:text-indigo-400 transition-colors">
                          <FiShield className="inline mr-1" /> All architectural changes are cryptographically secured
                       </p>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Manual Status Overlay */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in-95 border border-slate-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 -z-10"></div>
             
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <FiShield size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Verify Status</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Manual Core Override</p>
                </div>
             </div>

             <div className="flex gap-4 mb-10">
                <button 
                  onClick={() => setEditingStatus("present")} 
                  className={`flex-1 py-5 rounded-[1.5rem] border-2 flex flex-col items-center gap-3 transition-all ${
                    editingStatus === 'present' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10' : 'border-slate-100 hover:border-slate-200 text-slate-400 grayscale'
                  }`}
                >
                  <FiCheckCircle size={28} className={editingStatus === 'present' ? 'animate-bounce' : ''} /> 
                  <span className="text-[10px] font-bold uppercase tracking-widest">Present</span>
                </button>
                <button 
                  onClick={() => setEditingStatus("absent")} 
                  className={`flex-1 py-5 rounded-[1.5rem] border-2 flex flex-col items-center gap-3 transition-all ${
                    editingStatus === 'absent' ? 'border-rose-500 bg-rose-50 text-rose-700 ring-4 ring-rose-500/10' : 'border-slate-100 hover:border-slate-200 text-slate-400 grayscale'
                  }`}
                >
                  <FiXCircle size={28} className={editingStatus === 'absent' ? 'animate-bounce' : ''} /> 
                  <span className="text-[10px] font-bold uppercase tracking-widest">Absent</span>
                </button>
             </div>

             <div className="flex gap-3">
                <button onClick={() => setEditingStudent(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={() => updateAttendance(editingStudent, editingStatus)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98]">Confirm Override</button>
             </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out; }
        .zoom-in-95 { animation: zoom-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

const SidebarLink = ({ icon, label, active = false, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all group ${
      active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'
    }`}
  >
    <span className={`${active ? 'text-white' : 'text-slate-600 group-hover:text-indigo-400'} transition-colors`}>{icon}</span>
    {label}
  </button>
);

const StatCard = ({ label, value, icon, trend, color }) => (
  <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full -mr-10 -mt-10 group-hover:bg-indigo-50 transition-colors"></div>
    <div className="flex items-start justify-between mb-6 relative">
      <div className={`w-14 h-14 rounded-2xl ${color} text-white flex items-center justify-center text-2xl shadow-xl shadow-slate-900/5 group-hover:rotate-12 transition-transform`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl ${
        trend === 'Live' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
        trend === 'Stable' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
        trend === 'Action Required' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
        'bg-slate-50 text-slate-500 border border-slate-100'
      }`}>
        {trend}
      </span>
    </div>
    <div className="relative">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">{label}</p>
      <p className="text-4xl font-bold text-slate-800 tracking-tighter">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;