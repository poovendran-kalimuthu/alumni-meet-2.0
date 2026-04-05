import { useState, useEffect } from "react";
import { FiUser, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiShield, FiKey, FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  // Credentials moved to backend

  // Progress bar effect for success state
  useEffect(() => {
    if (success) {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 2 : 100));
      }, 20);
      return () => clearInterval(interval);
    }
  }, [success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch("https://alumni-meet-2-0.onrender.com/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.username, password: formData.password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Access Denied: Invalid administrator credentials");
      }

      setSuccess(true);
      localStorage.setItem("admin_token", "jwt-token-placeholder"); // Token is handled via cookies in this app's architecture
      localStorage.setItem("admin_email", formData.username);

      setTimeout(() => navigate("/portal/admin/dashboard"), 1800);
    } catch (err) {
      setError(err.message);
      setFormData(prev => ({ ...prev, password: "" })); // Clear password on failure
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 relative overflow-hidden font-['Space_Grotesk']">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      {/* Success Overlay */}
      {success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-xl transition-all duration-500 animate-in fade-in">
          <div className="bg-zinc-900 border border-white/10 p-12 rounded-[2rem] text-center shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Access Granted</h3>
              <p className="text-zinc-400 mb-8 text-sm">Synchronizing administrative workspace...</p>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[440px]">
        {/* Branding */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-6 transform hover:scale-105 transition-transform">
            <FiShield className="text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            SPECTRUM<span className="text-indigo-500">ADMIN</span>
          </h1>
          <div className="h-px w-12 bg-zinc-800 my-4" />
          <p className="text-zinc-500 font-semibold tracking-[0.2em] text-[10px] uppercase">Nexus Protocol</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 sm:p-12 shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[2.5rem] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="mb-10">
              <h2 className="text-xl font-bold text-white mb-1">Administrative Login</h2>
              <p className="text-zinc-500 text-xs">Enter your secure credentials to proceed</p>
            </div>

            {error && (
              <div className="mb-8 flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl animate-shake">
                <FiAlertCircle className="text-red-500 shrink-0" />
                <p className="text-red-400 text-xs font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Identity Endpoint</label>
                <div className="relative group">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="email"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-zinc-700"
                    placeholder="admin@spectrum.tech"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Security Key</label>
                <div className="relative group">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type={passwordVisible ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-12 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-zinc-700"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                  >
                    {passwordVisible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-500 hover:text-white transition-all duration-300 disabled:opacity-50 group relative overflow-hidden shadow-lg shadow-white/5 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    AUTHORIZE ACCESS <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center space-y-6">
          <a href="/" className="text-zinc-600 hover:text-zinc-300 text-xs font-medium transition-colors flex items-center justify-center gap-2 group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to public terminal
          </a>
          <div className="flex items-center justify-center gap-6 text-[9px] text-zinc-700 font-bold tracking-[0.3em] uppercase">
            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-green-500/40 rounded-full" /> AES-256</span>
            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-500/40 rounded-full" /> SECURE SESSION</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default AdminLogin;