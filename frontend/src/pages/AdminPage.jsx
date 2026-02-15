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

  const ADMIN_CREDENTIALS = {
    username: "careerconnect@spectrum.co.in",
    password: "Spectrum22112233"
  };

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
      if (formData.username !== ADMIN_CREDENTIALS.username ||
        formData.password !== ADMIN_CREDENTIALS.password) {
        throw new Error("Access Denied: Invalid administrator credentials");
      }

      setSuccess(true);
      localStorage.setItem("admin_token", "bW9jay10b2tlbi0xMjM="); // Use a mock token
      localStorage.setItem("admin_email", formData.username);

      setTimeout(() => navigate("/admin/dashboard"), 1800);
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#030712] relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
      </div>

      {/* Success Overlay */}
      {success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-500">
          <div className="bg-gray-900 border border-white/10 p-12 rounded-[2.5rem] text-center shadow-2xl max-w-sm w-full mx-4">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
              <svg className="w-12 h-12 text-white animate-[stroke_0.6s_ease-in-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">Verified</h3>
            <p className="text-gray-400 mb-8">Initializing secure dashboard...</p>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-100 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[480px]">
        {/* Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-300">
            <FiShield className="text-white text-3xl" />
          </div>
          <h1 className="mt-6 text-4xl font-black text-white tracking-tight">ALUMNI<span className="text-blue-500">MEET</span></h1>
          <p className="text-gray-500 font-medium tracking-widest text-xs uppercase mt-2">Internal Governance Portal</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/50 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Admin Login</h2>
            <p className="text-gray-400 text-sm">Please enter your specialized credentials</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl animate-shake">
              <FiAlertCircle className="text-red-500 shrink-0" />
              <p className="text-red-200 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email Identity</label>
              <div className="relative group">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-gray-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="admin@spectrum.co.in"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Security Key</label>
              <div className="relative group">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-gray-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {passwordVisible ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-500 hover:text-white transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  AUTHORIZE ACCESS <FiArrowRight />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center space-y-4">
          <a href="/" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Return to public site
          </a>
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600 font-bold tracking-widest uppercase">
            <span>Encrypted AES-256</span>
            <span className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
            <span>Session Monitored</span>
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
      `}</style>
    </div>
  );
};

export default AdminLogin;