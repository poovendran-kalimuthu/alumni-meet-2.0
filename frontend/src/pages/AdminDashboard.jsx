import React, { useState, useEffect, useMemo } from "react";
import { axiosInstance } from "../lib/axios";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { 
  LayoutDashboard, Users, Calendar, Activity, Settings, LogOut, Search, Download, 
  RefreshCcw, MapPin, Clock, CheckCircle2, XCircle, Copy, ExternalLink, Shield, 
  Layers, Command, Save, UserPlus, Plus, Settings2, Trash2, Fingerprint, Navigation, 
  Maximize, ShieldCheck, ChevronRight 
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
  const [activeTab, setActiveTab] = useState("overview"); 
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState("registry");
  
  const [sessionFormData, setSessionFormData] = useState({
    name: "", locationName: "", dateTime: "", lat: 10.654281, lng: 77.035257, 
    radius: 200, isAttendanceEnabled: true, eligibleYears: [], eligibleDepartments: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkCommon, setBulkCommon] = useState({ className: "", year: "1st Year", department: "CSE", password: "" });
  const [bulkRawText, setBulkRawText] = useState("");
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserFormData, setNewUserFormData] = useState({
    rollNo: "", name: "", className: "", year: "1st Year", department: "CSE", password: "", email: ""
  });

  useEffect(() => {
    loadUsers(); loadSessions(); loadAttributes();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/auth/users");
      setStudents(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await axiosInstance.get("/sessions");
      if (res.data.success) setSessions(res.data.data);
    } catch (err) { toast.error("Failed to load sessions"); }
    finally { setSessionsLoading(false); }
  };

  const loadSessionAttendance = async (sessionId) => {
    if (!sessionId) return;
    try {
      const res = await axiosInstance.get(`/sessions/${sessionId}/attendance`);
      if (res.data.success) setSessionAttendance(res.data.data);
    } catch (err) { console.error(err); }
  };

  const loadAttributes = async () => {
    try {
      const res = await axiosInstance.get("/auth/attributes");
      if (res.data.success) {
        setAvailableYears(res.data.data.years);
        setAvailableDepts(res.data.data.departments);
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await axiosInstance.post("/auth/users", newUserFormData);
      if (res.data.success) {
        toast.success("User created!");
        setStudents(prev => [...prev, res.data.data]);
        setIsCreateModalOpen(false);
      }
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setIsSaving(false); }
  };

  const parseBulkText = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && (lines[0].toLowerCase().includes("roll") || lines[0].toLowerCase().includes("name"))) lines.shift();
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
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          const parsed = jsonData.filter(row => row.length > 0).map(row => ({
            rollNo: row[0]?.toString().trim() || "", name: row[1]?.toString().trim() || ""
          })).filter(u => u.rollNo || u.name);
          if (parsed.length > 0 && (parsed[0].rollNo.toLowerCase().includes("roll") || parsed[0].name.toLowerCase().includes("name"))) parsed.shift();
          setBulkPreview(parsed);
          setBulkRawText(parsed.map(u => `${u.rollNo}, ${u.name}`).join("\n"));
        } catch (err) { toast.error("Error parsing Excel"); }
      } else {
        const text = ev.target.result;
        setBulkRawText(text);
        setBulkPreview(parseBulkText(text));
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkPreview.length === 0) return toast.error("No users parsed");
    setIsBulkSaving(true);
    try {
      const res = await axiosInstance.post("/auth/users/bulk", { users: bulkPreview, ...bulkCommon });
      if (res.data.success) {
        setBulkResult(res.data.data);
        toast.success(res.data.message);
        loadUsers();
      }
    } catch (err) { toast.error("Upload failed"); }
    finally { setIsBulkSaving(false); }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionAttendance(selectedSessionId);
      const session = sessions.find(s => s._id === selectedSessionId);
      if (session) setSessionFormData({ ...session, eligibleYears: session.eligibleYears || [], eligibleDepartments: session.eligibleDepartments || [] });
    }
  }, [selectedSessionId, sessions]);

  const selectedSession = useMemo(() => sessions.find(s => s._id === selectedSessionId), [sessions, selectedSessionId]);

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const method = selectedSessionId ? 'patch' : 'post';
      const url = selectedSessionId ? `/sessions/${selectedSessionId}` : '/sessions';
      const res = await axiosInstance[method](url, sessionFormData);
      if (res.data.success) {
        toast.success(selectedSessionId ? "Updated!" : "Created!");
        loadSessions();
        if (!selectedSessionId) setActiveTab("sessions");
      }
    } catch (err) { toast.error("Failed to save"); }
    finally { setIsSaving(false); }
  };

  const toggleSessionStatus = async (session) => {
    try {
      const res = await axiosInstance.patch(`/sessions/${session._id}`, { isAttendanceEnabled: !session.isAttendanceEnabled });
      if (res.data.success) {
        setSessions(prev => prev.map(s => s._id === session._id ? res.data.data : s));
        toast.success("Status Toggled");
      }
    } catch (err) { toast.error("Failed"); }
  };

  const copySessionLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/session/${id}`);
    toast.success("Link Copied!");
  };

  const updateAttendance = async (studentId, newStatus) => {
    if (!selectedSessionId) return;
    try {
      await axiosInstance.post(`/sessions/${selectedSessionId}/attendance/manual`, { 
        sessionId: selectedSessionId, userId: studentId, status: newStatus 
      });
      toast.success("Attendance Overridden");
      loadSessionAttendance(selectedSessionId);
      setEditingStudent(null);
    } catch (err) { toast.error("Failed to update"); }
  };

  const getAttendanceForUser = (userId) => {
    return sessionAttendance.find(a => String(a.userId?._id || a.userId) === String(userId));
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.rollNo.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase());
      const matchesYear = yearFilter === "all" || s.year === yearFilter;
      const matchesDept = deptFilter === "all" || s.department === deptFilter;
      const isPresent = !!getAttendanceForUser(s._id);
      const matchesStatus = statusFilter === "all" || (statusFilter === "present" && isPresent) || (statusFilter === "absent" && !isPresent);
      return matchesSearch && matchesYear && matchesDept && matchesStatus;
    });
  }, [students, search, yearFilter, deptFilter, statusFilter, sessionAttendance]);

  const exportToPDF = () => {
    if (!selectedSession) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold").setFontSize(16).text("SPECTRUM Attendance Report", 105, 20, { align: "center" });
    doc.setFontSize(12).text(`Session: ${selectedSession.name}`, 105, 30, { align: "center" });
    const tableRows = filteredStudents.map(s => {
      const att = getAttendanceForUser(s._id);
      return [s.rollNo, s.name, s.className, att ? "PRESENT" : "ABSENT", att ? new Date(att.timestamp).toLocaleTimeString() : "-"];
    });
    autoTable(doc, {
      head: [["Roll No", "Student Name", "Class", "Status", "Time"]],
      body: tableRows, startY: 45, theme: 'grid', headStyles: { fillColor: [79, 70, 229] },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 3) d.cell.styles.textColor = d.cell.raw === 'ABSENT' ? [239, 68, 68] : [16, 185, 129];
      }
    });
    doc.save(`Attendance_${selectedSession.name}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-8 shadow-indigo-600/30" />
      <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Initializing Terminal...</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050508] flex font-['Space_Grotesk'] text-slate-200">
      {/* Sidebar - Genesis Terminal Style */}
      <aside className="w-80 border-r border-white/5 bg-[#08080C]/80 backdrop-blur-3xl p-8 flex flex-col hidden lg:flex sticky top-0 h-screen">
        <div className="flex items-center gap-4 mb-14 px-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white rotate-3 shadow-indigo-600/30 shadow-2xl">
            <Command size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-white">GENESIS</h1>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.25em]">Admin Portal</p>
          </div>
        </div>

        <nav className="space-y-3 flex-1">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <SidebarItem icon={<Calendar size={20}/>} label="Sessions" active={activeTab === 'sessions' || activeTab === 'session-detail'} onClick={() => setActiveTab('sessions')} />
          <SidebarItem icon={<Users size={20}/>} label="Registry" active={activeTab === 'registry'} onClick={() => { setActiveTab('registry'); setSelectedSessionId(null); }} />
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5">
          <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="w-full bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 py-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3">
             <LogOut size={16} /> Terminate Session
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative min-w-0 h-screen overflow-y-auto">
        <header className="h-28 border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl flex items-center justify-between px-12 sticky top-0 z-50">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
              {activeTab === 'overview' ? 'Command Center' : activeTab === 'sessions' ? 'Session Gallery' : selectedSession?.name || 'Workspace'}
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
               {currentTime.toLocaleTimeString()} <span className="text-slate-700">|</span> Node Active
            </div>
          </div>
          <div className="flex gap-4">
            {activeTab === 'overview' && <button onClick={() => setIsCreateModalOpen(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"> <Plus size={16}/> New Deploy </button>}
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Admin`} alt="avatar" />
            </div>
          </div>
        </header>

        <main className="p-12">
          {activeTab === 'overview' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <MetricCard label="Registry Size" value={students.length} icon={<Users size={24}/>} color="indigo" />
                <MetricCard label="Live Sessions" value={sessions.length} icon={<Activity size={24}/>} color="emerald" />
                <MetricCard label="System Load" value="2.1%" icon={<Shield size={24}/>} color="amber" />
                <MetricCard label="Verification Success" value="98.5%" icon={<Fingerprint size={24}/>} color="blue" />
              </div>
              <div className="bg-[#08080C] rounded-[3rem] border border-white/5 p-12 h-96">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{n:'1',v:40},{n:'2',v:60},{n:'3',v:45},{n:'4',v:80}]}>
                       <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                       <XAxis hide /><YAxis hide /><Tooltip /><Area dataKey="v" stroke="#6366f1" strokeWidth={4} fill="url(#g)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
               <button onClick={() => { setSelectedSessionId(null); setWorkspaceTab('settings'); setActiveTab('session-detail'); }} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-4 hover:bg-white/10 hover:border-indigo-500/50 transition-all group">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-all"> <Plus size={32} className="text-slate-500" /> </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Initiate New Node</span>
               </button>
               {sessions.map(s => (
                 <div key={s._id} className="bg-[#08080C] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between group hover:border-indigo-500/30 transition-all h-64">
                    <div>
                       <div className="flex justify-between items-start mb-4">
                          <h4 className="text-xl font-bold text-white">{s.name}</h4>
                          <button onClick={() => toggleSessionStatus(s)} className={`w-12 h-6 rounded-full p-1 transition-all ${s.isAttendanceEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                             <div className={`w-4 h-4 bg-white rounded-full transition-all ${s.isAttendanceEnabled ? 'translate-x-6' : ''}`} />
                          </button>
                       </div>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><MapPin size={12}/> {s.locationName}</p>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={() => { setSelectedSessionId(s._id); setActiveTab('session-detail'); setWorkspaceTab('registry'); }} className="flex-1 py-4 bg-indigo-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">Workspace</button>
                       <button onClick={() => copySessionLink(s._id)} className="w-14 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10"> <Copy size={18}/> </button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'session-detail' && (
             <div className="space-y-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                   <div className="flex items-center gap-4 bg-white/5 rounded-3xl p-2 pr-8 border border-white/5">
                      <button onClick={() => setWorkspaceTab('registry')} className={`px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${workspaceTab === 'registry' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}>Registry Matrix</button>
                      <button onClick={() => setWorkspaceTab('settings')} className={`px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${workspaceTab === 'settings' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}>Geofence Keys</button>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={exportToPDF} className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/5 flex items-center gap-3"> <Download size={16}/> Export Segment </button>
                      <button onClick={() => setIsBulkModalOpen(true)} className="px-8 py-4 bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3"> <UserPlus size={16}/> Mass Registration </button>
                   </div>
                </div>

                {workspaceTab === 'registry' ? (
                   <div className="bg-[#08080C] rounded-[3.5rem] border border-white/5 overflow-hidden">
                      <div className="p-10 border-b border-white/5 flex flex-wrap gap-4 items-center">
                         <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Query roll no or identifier..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all" />
                         </div>
                         <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest outline-none appearance-none cursor-pointer">
                            <option value="all">Any Cycle</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                         </select>
                         <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest outline-none appearance-none cursor-pointer">
                            <option value="all">Any Status</option>
                            <option value="present">Verified</option>
                            <option value="absent">Missing</option>
                         </select>
                         <button onClick={loadUsers} className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 border border-white/5"> <RefreshCcw size={18}/> </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-white/2 border-b border-white/5">
                                 <th className="px-12 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subscriber Node</th>
                                 <th className="px-12 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID Hash</th>
                                 <th className="px-12 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sector</th>
                                 <th className="px-12 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                 <th className="px-12 py-6 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {filteredStudents.map(student => {
                                 const att = getAttendanceForUser(student._id);
                                 const isPresent = !!att;
                                 return (
                                    <tr key={student._id} className="group hover:bg-white/2 transition-all">
                                       <td className="px-12 py-8 flex items-center gap-5">
                                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${isPresent ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}> {student.name[0]} </div>
                                          <div> <p className="text-sm font-bold text-white">{student.name}</p> <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{student.email || 'Registry Node'}</p> </div>
                                       </td>
                                       <td className="px-12 py-8"> <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-4 py-2 rounded-lg border border-white/5">{student.rollNo}</span> </td>
                                       <td className="px-12 py-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{student.department} â€¢ {student.year}</td>
                                       <td className="px-12 py-8">
                                          <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${isPresent ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                             <div className={`w-1.5 h-1.5 rounded-full ${isPresent ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} /> {isPresent ? 'Verified' : 'Absent'}
                                          </div>
                                       </td>
                                       <td className="px-12 py-8 text-right">
                                          <button onClick={() => { setEditingStudent(student._id); setEditingStatus(isPresent ? 'present' : 'absent'); }} className="p-4 bg-white/5 rounded-2xl text-slate-500 hover:text-indigo-400 hover:bg-white/10 transition-all"> <Settings2 size={18}/> </button>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                      </div>
                   </div>
                ) : (
                   <form onSubmit={handleSessionSubmit} className="bg-[#08080C] rounded-[3.5rem] border border-white/5 p-12 space-y-12 max-w-4xl mx-auto shadow-2xl">
                        <div className="flex justify-between items-center pb-8 border-b border-white/5">
                           <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-4"> <Shield className="text-indigo-500" size={28}/> Geofence Configuration </h3>
                           {selectedSessionId && <button type="button" onClick={() => handleDeleteSession(selectedSessionId)} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"> <Trash2 size={16}/> Decommission </button>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           <div className="space-y-3"> <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Identity Tag</label> <input required value={sessionFormData.name} onChange={e => setSessionFormData({...sessionFormData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 font-bold text-white outline-none focus:border-indigo-500 transition-all" /> </div>
                           <div className="space-y-3"> <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Spatial Label</label> <input required value={sessionFormData.locationName} onChange={e => setSessionFormData({...sessionFormData, locationName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 font-bold text-white outline-none focus:border-indigo-500 transition-all" /> </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                           <div className="space-y-3"> <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Latitude</label> <input required type="number" step="0.000001" value={sessionFormData.lat} onChange={e => setSessionFormData({...sessionFormData, lat: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 font-bold text-white outline-none focus:border-indigo-500 transition-all" /> </div>
                           <div className="space-y-3"> <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Longitude</label> <input required type="number" step="0.000001" value={sessionFormData.lng} onChange={e => setSessionFormData({...sessionFormData, lng: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 font-bold text-white outline-none focus:border-indigo-500 transition-all" /> </div>
                           <div className="space-y-3"> <div className="flex justify-between items-center mb-1"> <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Radius</label> <span className="text-indigo-400 text-[10px] font-bold">{sessionFormData.radius}m</span> </div> <input type="range" min="20" max="1000" value={sessionFormData.radius} onChange={e => setSessionFormData({...sessionFormData, radius: parseInt(e.target.value)})} className="w-full h-2 bg-white/5 rounded-lg appearance-none accent-indigo-600" /> </div>
                        </div>
                        <div className="space-y-6">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sector Eligibility (Years)</label>
                           <div className="flex flex-wrap gap-4">
                              {['1st Year','2nd Year','3rd Year','4th Year','Alumni'].map(y => (
                                 <button key={y} type="button" onClick={() => {
                                    const curr = sessionFormData.eligibleYears || [];
                                    const next = curr.includes(y) ? curr.filter(i => i !== y) : [...curr, y];
                                    setSessionFormData({...sessionFormData, eligibleYears: next});
                                 }} className={`px-6 py-3 rounded-xl text-[10px] font-bold transition-all border ${sessionFormData.eligibleYears.includes(y) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:border-indigo-500/50'}`}>{y}</button>
                              ))}
                           </div>
                        </div>
                        <div className="pt-8 flex items-center justify-between">
                           <button type="submit" disabled={isSaving} className="px-12 py-5 bg-indigo-600 rounded-[2rem] font-bold text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-600/30 active:scale-95"> <Save size={18}/> Commit Config </button>
                           <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest"> <ShieldCheck size={16}/> Encryption Alpha-7 </div>
                        </div>
                   </form>
                )}
             </div>
          )}
        </main>
      </div>

      {/* Manual Status Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-[#050508]/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#08080C] border border-white/5 rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
              <div className="flex items-center gap-6 mb-12 relative z-10">
                 <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30"> <Shield size={36}/> </div>
                 <div> <h3 className="text-3xl font-bold text-white tracking-tight">Manual Override</h3> <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.25em] mt-1">Registry Correction Protocol</p> </div>
              </div>
              <div className="flex gap-6 mb-12 relative z-10">
                 <button onClick={() => setEditingStatus("present")} className={`flex-1 py-12 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-6 ${editingStatus === 'present' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-white/5 text-slate-500 hover:border-white/10'}`}> <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${editingStatus === 'present' ? 'bg-emerald-500 text-white' : 'bg-white/5'}`}> <CheckCircle2 size={32}/> </div> <span className="text-[10px] font-bold uppercase tracking-widest">Verified</span> </button>
                 <button onClick={() => setEditingStatus("absent")} className={`flex-1 py-12 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-6 ${editingStatus === 'absent' ? 'border-rose-500 bg-rose-500/10 text-rose-500' : 'border-white/5 text-slate-500 hover:border-white/10'}`}> <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${editingStatus === 'absent' ? 'bg-rose-500 text-white' : 'bg-white/5'}`}> <XCircle size={32}/> </div> <span className="text-[10px] font-bold uppercase tracking-widest">Missing</span> </button>
              </div>
              <div className="flex gap-4 relative z-10">
                 <button onClick={() => setEditingStudent(null)} className="flex-1 py-5 bg-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-white/10">Abort</button>
                 <button onClick={() => updateAttendance(editingStudent, editingStatus)} className="flex-[2] py-5 bg-indigo-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700">Commit Override</button>
              </div>
           </div>
        </div>
      )}

      {/* Mass Reg Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-[#050508]/80 backdrop-blur-xl z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#08080C] border border-white/5 rounded-[4rem] p-12 w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
              <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
                 <h3 className="text-3xl font-bold text-white tracking-tight flex items-center gap-4"> <Download className="text-indigo-500" size={32}/> Mass Registration </h3>
                 <button onClick={() => setIsBulkModalOpen(false)} className="p-4 bg-white/5 rounded-2xl text-slate-500"> <XCircle size={24}/> </button>
              </div>
              <div className="overflow-y-auto pr-2 space-y-10">
                 {bulkResult ? (
                    <div className="space-y-8 py-10">
                       <div className="grid grid-cols-2 gap-8">
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-10 text-center"> <p className="text-5xl font-bold text-emerald-500 mb-2">{bulkResult.created.length}</p> <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Created</p> </div>
                          <div className="bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] p-10 text-center"> <p className="text-5xl font-bold text-rose-500 mb-2">{bulkResult.skipped.length}</p> <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Skipped</p> </div>
                       </div>
                       <button onClick={() => setBulkResult(null)} className="w-full py-5 bg-indigo-600 rounded-3xl font-bold text-[10px] uppercase tracking-widest text-white">Next Sequence</button>
                    </div>
                 ) : (
                    <form onSubmit={handleBulkSubmit} className="space-y-10">
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="space-y-3"> <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Class</label> <input required placeholder="e.g. CSE-A" value={bulkCommon.className} onChange={e => setBulkCommon({...bulkCommon, className: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all" /> </div>
                          <div className="space-y-3"> <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sector</label> <select value={bulkCommon.department} onChange={e => setBulkCommon({...bulkCommon, department: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none appearance-none"> {['CSE','IT','ECE','EEE','MECH','CIVIL','AI&DS','ACT'].map(d => <option key={d} value={d}>{d}</option>)} </select> </div>
                          <div className="space-y-3"> <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cycle</label> <select value={bulkCommon.year} onChange={e => setBulkCommon({...bulkCommon, year: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none appearance-none"> {['1st Year','2nd Year','3rd Year','4th Year','Alumni'].map(y => <option key={y} value={y}>{y}</option>)} </select> </div>
                          <div className="space-y-3"> <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Master Key</label> <input type="password" required value={bulkCommon.password} onChange={e => setBulkCommon({...bulkCommon, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none" /> </div>
                       </div>
                       <div className="space-y-6">
                          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer bg-white/2 hover:bg-white/5 hover:border-indigo-500/50 transition-all">
                             <Download className="text-slate-600 mb-4" size={32}/> <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center px-8">Drop Excel sheet or click to browse <br/> <span className="text-slate-700 lowercase mt-2 block">(.xlsx, .xls support enabled)</span></p>
                             <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleBulkFileUpload} />
                          </label>
                          <textarea rows={5} value={bulkRawText} onChange={e => { setBulkRawText(e.target.value); setBulkPreview(parseBulkText(e.target.value)); }} placeholder="RollNo, Name (one per cycle)" className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-xs font-mono text-slate-400 outline-none focus:border-indigo-500 transition-all resize-none" />
                       </div>
                       <div className="flex gap-4">
                          <button type="submit" disabled={isBulkSaving || bulkPreview.length === 0} className="flex-[2] py-5 bg-indigo-600 rounded-3xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-2xl shadow-indigo-600/30"> Execute {bulkPreview.length} Initializations </button>
                          <button type="button" onClick={() => { setBulkPreview([]); setBulkRawText(""); }} className="flex-1 py-5 bg-white/5 rounded-3xl font-bold text-[10px] uppercase tracking-widest text-slate-500"> Flush Buffer </button>
                       </div>
                    </form>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Initialize Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-[#050508]/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#08080C] border border-white/5 rounded-[3.5rem] p-12 w-full max-w-2xl shadow-2xl relative overflow-hidden">
              <h3 className="text-3xl font-bold text-white tracking-tight mb-10 flex items-center gap-4"> <UserPlus className="text-indigo-500" size={32}/> Initialize New Node </h3>
              <form onSubmit={handleCreateUser} className="space-y-8">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3"> <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Identity Name</label> <input required value={newUserFormData.name} onChange={e => setNewUserFormData({...newUserFormData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all" /> </div>
                    <div className="space-y-3"> <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Roll No Hash</label> <input required value={newUserFormData.rollNo} onChange={e => setNewUserFormData({...newUserFormData, rollNo: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all" /> </div>
                 </div>
                 <div className="space-y-3"> <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Terminal Auth Email</label> <input required type="email" value={newUserFormData.email} onChange={e => setNewUserFormData({...newUserFormData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all" /> </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3"> <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sector</label> <select value={newUserFormData.department} onChange={e => setNewUserFormData({...newUserFormData, department: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none appearance-none"> {['CSE','IT','ECE','EEE','MECH','CIVIL','AI&DS','ACT'].map(d => <option key={d} value={d}>{d}</option>)} </select> </div>
                    <div className="space-y-3"> <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cycle</label> <select value={newUserFormData.year} onChange={e => setNewUserFormData({...newUserFormData, year: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none appearance-none"> {['1st Year','2nd Year','3rd Year','4th Year','Alumni'].map(y => <option key={y} value={y}>{y}</option>)} </select> </div>
                 </div>
                 <div className="pt-8 flex gap-4">
                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-5 bg-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500">Abort</button>
                    <button type="submit" disabled={isSaving} className="flex-[2] py-5 bg-indigo-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700"> Commit Node </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      ` }} />
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all group ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
    <div className={`transition-all duration-500 ${active ? 'text-white' : 'group-hover:text-indigo-400 group-hover:scale-110'}`}> {icon} </div>
    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{label}</span>
  </button>
);

const MetricCard = ({ label, value, icon, color }) => {
  const colors = {
    indigo: 'from-indigo-600 to-blue-600 shadow-indigo-600/20',
    emerald: 'from-emerald-600 to-teal-600 shadow-emerald-500/20',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/20',
    blue: 'from-blue-500 to-cyan-500 shadow-blue-500/20',
  };
  return (
    <div className="bg-[#08080C] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/2 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-all duration-700" />
      <div className={`p-4 rounded-xl bg-gradient-to-br ${colors[color]} text-white w-fit mb-8 shadow-xl relative z-10`}> {icon} </div>
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
        <p className="text-4xl font-bold text-white tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
