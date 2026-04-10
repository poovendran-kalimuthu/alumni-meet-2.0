// HomePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';
import toast from "react-hot-toast";
import { 
  FiCommand, FiActivity, FiMapPin, FiShield, 
  FiCheckCircle, FiXCircle, FiArrowRight, 
  FiClock, FiExternalLink, FiLogOut, FiMenu 
} from "react-icons/fi";

const HomePage = () => {
  const { sessionId: urlSessionId } = useParams();
  const navigate = useNavigate();
  const { authUser, logout } = useAuthStore();
  
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState("pending"); // pending, checking, verified, not-verified
  const [userLocation, setUserLocation] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);
  const [distanceFromVenue, setDistanceFromVenue] = useState(null);
  const [gpsInstructions, setGpsInstructions] = useState(false);

  // Student information
  const studentInfo = useMemo(() => ({
    name: authUser?.name || 'N/A',
    rollNo: authUser?.rollNo || 'N/A',
    className: authUser?.className || 'N/A'
  }), [authUser]);

  // Fetch either all active sessions or one specific session
  useEffect(() => {
    const fetchSessionData = async () => {
      setLoading(true);
      try {
        if (urlSessionId) {
          // Direct session access
          const res = await axiosInstance.get(`/sessions/${urlSessionId}`);
          if (res.data.success) {
            setSelectedSession(res.data.data);
          } else {
            toast.error("Session not found");
          }
        } else {
          // Gallery view
          const res = await axiosInstance.get("/sessions/active");
          if (res.data.success) {
            setSessions(res.data.data);
          }
        }
      } catch (err) {
        console.error("Error fetching sessions:", err);
        if (urlSessionId) toast.error("Failed to load session details");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [urlSessionId]);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported on this device"));
        return;
      }
      setGpsInstructions(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setGpsInstructions(false);
          resolve({ lat: latitude, lng: longitude, accuracy });
        },
        (error) => {
          setGpsInstructions(false);
          reject(new Error(error.code === 1 ? "Location access denied" : "Unable to fetch location"));
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  };

  const verifyLocation = async () => {
    if (locationStatus === "checking" || !selectedSession) return;
    setLocationStatus("checking");
    setLocationDetails(null);

    try {
      const location = await getCurrentLocation();
      const distance = calculateDistance(location.lat, location.lng, selectedSession.lat, selectedSession.lng);
      
      setUserLocation(location);
      setDistanceFromVenue(distance);

      if (distance <= selectedSession.radius) {
        setLocationStatus("verified");
        setLocationDetails({
          distance: `${distance.toFixed(1)}m`,
          accuracy: `${location.accuracy.toFixed(1)}m`,
          status: "Verified ✓"
        });
        toast.success("Location verified!");
      } else {
        setLocationStatus("not-verified");
        setLocationDetails({
          distance: `${distance.toFixed(1)}m`,
          accuracy: `${location.accuracy.toFixed(1)}m`,
          status: "Out of Range ✗"
        });
        toast.error(`You are ${distance.toFixed(0)}m away (Max: ${selectedSession.radius}m)`);
      }
    } catch (err) {
      setLocationStatus("not-verified");
      toast.error(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSession || locationStatus !== 'verified' || !userLocation || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        sessionId: selectedSession._id,
        userLocation: { lat: userLocation.lat, lng: userLocation.lng, accuracy: userLocation.accuracy }
      };

      await axiosInstance.post("/auth/attendance", payload);
      toast.success("Attendance Posted Successfully!");
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 animate-pulse">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl"></div>
        <div className="h-6 bg-slate-100 rounded-full w-48"></div>
        <div className="w-full space-y-3">
          <div className="h-32 bg-slate-50 rounded-3xl"></div>
          <div className="h-32 bg-slate-50 rounded-3xl"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-['Space_Grotesk'] text-[#1E293B]">
      
      {/* Header (Branding) - Restoration of "Previous" look with enhancement */}
      <header className="bg-[#0F172A] text-white pt-12 pb-24 px-6 rounded-b-[4rem] relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full -ml-16 -mb-16"></div>
        
        <div className="max-w-xl mx-auto flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <FiShield size={18} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">SPECTRUM</h1>
            </div>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] opacity-80">Smart Attendance System</p>
          </div>
          <button 
            onClick={logout}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
          >
            <FiLogOut className="group-hover:text-indigo-400 transition-colors" />
          </button>
        </div>

        <div className="max-w-xl mx-auto mt-10 relative z-10">
           {urlSessionId && selectedSession ? (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-3xl font-bold mb-2">{selectedSession.name}</h2>
               <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                 <span className="flex items-center gap-1.5"><FiMapPin className="text-indigo-400" /> {selectedSession.locationName}</span>
                 <span className="flex items-center gap-1.5"><FiClock className="text-indigo-400" /> {selectedSession.dateTime}</span>
               </div>
             </div>
           ) : (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-3xl font-bold mb-2">Welcome Back,</h2>
               <p className="text-slate-400 font-medium">Please select an active verification session to proceed.</p>
             </div>
           )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-6 -mt-12 pb-20 space-y-6 relative z-20">
        
        {/* Session Card (Student Info) */}
        {!urlSessionId ? (
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Sessions Gallery</h3>
               <span className="px-3 py-1 bg-white rounded-full text-[10px] font-bold text-indigo-600 border border-slate-100 shadow-sm">{sessions.length} Available</span>
             </div>
             
             {sessions.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-200 shadow-sm">
                   <FiActivity size={40} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-slate-500 font-bold">No active sessions found.</p>
                   <p className="text-slate-400 text-xs mt-1">Wait for an administrator to initialize an attendance event.</p>
                   <button onClick={() => window.location.reload()} className="mt-8 px-8 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all">Refresh Feed</button>
                </div>
             ) : (
               sessions.map(s => (
                 <div 
                   key={s._id}
                   onClick={() => navigate(`/session/${s._id}`)}
                   className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer overflow-hidden relative"
                 >
                   <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-100 transition-colors"></div>
                    <div className="flex justify-between items-start relative z-10 mb-4">
                       <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-slate-100 group-hover:bg-white group-hover:shadow-md transition-all">
                          <FiActivity size={20} />
                       </div>
                       <FiArrowRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={20} />
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-1">{s.name}</h4>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><FiMapPin /> {s.locationName}</p>
                 </div>
               ))
             )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            
            {/* Student Info Plate */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-5 w-full">
                  <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-[1.2rem] flex items-center justify-center font-bold text-indigo-600 text-xl shadow-inner">
                    {studentInfo.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Verified Profile</p>
                    <h3 className="text-lg font-bold text-slate-800 truncate">{studentInfo.name}</h3>
                  </div>
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                 <div className="flex-1 md:w-28 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Roll No</p>
                    <p className="text-sm font-bold text-slate-700">{studentInfo.rollNo}</p>
                 </div>
                 <div className="flex-1 md:w-28 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Class</p>
                    <p className="text-sm font-bold text-slate-700">{studentInfo.className}</p>
                 </div>
               </div>
            </div>

            {/* Attendance Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-xl space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 -z-0"></div>
               
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h3 className="text-xl font-bold text-slate-800">Post Attendance</h3>
                       <p className="text-xs text-slate-500 font-medium">Geo-fence verification required</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      locationStatus === 'verified' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      locationStatus === 'not-verified' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                      'bg-slate-50 text-slate-400 border border-slate-100 shadow-inner'
                    }`}>
                      {locationStatus === 'verified' ? <FiCheckCircle size={24} /> : locationStatus === 'not-verified' ? <FiXCircle size={24} /> : <FiMapPin size={24} />}
                    </div>
                 </div>

                 <div className={`p-6 rounded-[2rem] border transition-all mb-8 ${
                   locationStatus === 'verified' ? 'bg-emerald-50/30 border-emerald-100' : 
                   locationStatus === 'not-verified' ? 'bg-rose-50/30 border-rose-100' : 'bg-slate-50/50 border-slate-200'
                 }`}>
                    {locationDetails ? (
                       <div className="space-y-3 animate-in fade-in duration-300">
                          <div className="flex justify-between items-center text-xs">
                             <span className="text-slate-500 font-bold uppercase tracking-tighter">Current Distance</span>
                             <span className={`font-bold ${locationStatus === 'verified' ? 'text-emerald-600' : 'text-rose-600'}`}>{locationDetails.distance}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                             <span className="text-slate-500 font-bold uppercase tracking-tighter">GPS Precision</span>
                             <span className="font-bold text-slate-700">{locationDetails.accuracy}</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                             <span className="text-slate-500 font-bold uppercase tracking-tighter">Verification State</span>
                             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                               locationStatus === 'verified' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                             }`}>{locationDetails.status}</span>
                          </div>
                       </div>
                    ) : (
                      <div className="text-center py-4">
                         <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Stand within the <b>{selectedSession?.radius}m</b> perimeter of the venue to unlock the attendance vault.
                         </p>
                      </div>
                    )}
                 </div>

                 {gpsInstructions && (
                   <div className="mb-6 bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center gap-3 animate-pulse">
                      <FiActivity className="text-amber-500" />
                      <div>
                        <p className="text-[11px] font-bold text-amber-800">Activating GPS Network...</p>
                        <p className="text-[9px] text-amber-600">Please remain outdoors for faster satellite acquisition.</p>
                      </div>
                   </div>
                 )}

                 <div className="space-y-4">
                    <button 
                      type="button"
                      onClick={verifyLocation}
                      disabled={locationStatus === 'checking'}
                      className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        locationStatus === 'verified' ? 'bg-white border-2 border-emerald-500 text-emerald-600' : 
                        locationStatus === 'not-verified' ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200' : 
                        'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-900/10'
                      }`}
                    >
                      {locationStatus === 'checking' ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 
                       locationStatus === 'verified' ? <><FiCheckCircle /> Verification Locked</> : 
                       locationStatus === 'not-verified' ? <><FiXCircle /> Retry Positioning</> : <><FiMapPin /> Verify My Presence</>}
                    </button>

                    <button 
                      type="submit"
                      disabled={locationStatus !== 'verified' || isSubmitting}
                      className={`w-full py-5 rounded-2xl font-bold text-base transition-all shadow-2xl active:scale-95 ${
                        locationStatus === 'verified' ? 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700' : 
                        'bg-slate-100 text-slate-400 grayscale cursor-not-allowed shadow-none'
                      }`}
                    >
                      {isSubmitting ? 'Authenticating...' : 'Confirm Attendance'}
                    </button>
                 </div>
               </div>
            </form>
            
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 bg-transparent border border-slate-300 rounded-[1.5rem] text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              <FiArrowRight className="rotate-180" /> Back to Session Discovery
            </button>

          </div>
        )}

        {/* Informational Footer */}
        <div className="max-w-xl mx-auto flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-8">
           <FiShield className="text-slate-300" />
           <span>End-to-End Cryptographic Attendance</span>
        </div>

      </main>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-bottom { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out; }
        .slide-in-from-bottom-4 { animation: slide-in-bottom 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .slide-in-from-bottom-6 { animation: slide-in-bottom 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default HomePage;