import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import toast from "react-hot-toast";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFingerprint,
  faShieldHalved,
  faEye,
  faEyeSlash,
  faCircleNotch,
  faMicrochip,
  faCircleNodes
} from '@fortawesome/free-solid-svg-icons';

const Login = () => {
  const [formData, setFormData] = useState({ rollNo: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, isLoggingIn } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.rollNo.trim()) newErrors.rollNo = 'Roll number is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await login({
        ...formData,
        rollNo: formData.rollNo.toUpperCase().trim()
      });
      toast.success('System Initialized');
    } catch (error) {
      toast.error(error.message || 'Access Denied');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-['DM_Sans'] bg-white">

      {/* Left Section: Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 lg:p-24">
        <div className="w-full max-w-[400px]">

          {/* Logo */}
          <div className=" items-center gap-4 mb-12">

            <span className="font-['Space_Grotesk'] font-bold text-6xl tracking-tight text-[#0f172a]">
              Spectrum
            </span>
            <p className="text-slate-500 text-sm leading-relaxed">
              INSPIRE - INNOVATE - INTERACT
            </p>
          </div>

          <div className="mb-10">
            <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#0f172a] mb-3">
              Welcome Back!
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sign in to post your attendance for <span className='font-bold'>Rage to Research</span>  event.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0f172a]">Personnel Roll No</label>
              <div className="relative group">
                <FontAwesomeIcon icon={faFingerprint} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  name="rollNo"
                  value={formData.rollNo}
                  onChange={handleChange}
                  placeholder="Enter your roll number"
                  className={`w-full pl-12 pr-4 py-3 border ${errors.rollNo ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all text-[#0f172a]`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#0f172a]">Security Password</label>
              </div>
              <div className="relative group">
                <FontAwesomeIcon icon={faShieldHalved} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-3 border ${errors.password ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all text-[#0f172a]`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-3 font-['Space_Grotesk'] tracking-wide"
            >
              {isLoggingIn ? <FontAwesomeIcon icon={faCircleNotch} spin /> : "Sign In"}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Error in Login ? <button className="font-bold text-blue-600 hover:underline">Contact Event Coordinators</button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Section: Brand/AI Info */}
      <div className="hidden md:flex w-1/2 bg-[#062c30] relative overflow-hidden items-center justify-center p-16">
        {/* Subtle radial gradient to match reference */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a3d42] to-[#062c30]"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 blur-[100px] rounded-full"></div>

        <div className="relative z-10 w-full max-w-[500px]">
          <h2 className="font-['Space_Grotesk'] text-5xl font-bold text-white leading-[1.1] mb-8">
            Revolutionize Presence with <span className="text-blue-400">Smarter AI.</span>
          </h2>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-[2rem] mb-12">
            <p className="text-blue-100/80 text-lg italic leading-relaxed mb-6 font-light">
              "The AI-driven attendance system has completely transformed our alumni tracking. It’s reliable, efficient, and ensures our records are always synchronized."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">
                AC
              </div>
              <div>
                <p className="text-white font-bold">Alumni Connect</p>
                <p className="text-blue-300 text-xs">Event Coordination Team</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-blue-300 font-bold">Partnered Institutions</p>
            <div className="flex flex-wrap gap-x-8 gap-y-4 opacity-50 grayscale invert">
              <FontAwesomeIcon icon={faCircleNodes} className="text-2xl text-white" />
              <div className="h-6 w-24 bg-white/20 rounded-md"></div>
              <div className="h-6 w-20 bg-white/20 rounded-md"></div>
              <div className="h-6 w-28 bg-white/20 rounded-md"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;