import React, { useState } from 'react';
import '../login.css';
import { useAuthStore } from '../store/useAuthStore';

const Login = () => {
  const [formData, setFormData] = useState({
    rollNo: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  const { login, isLoggingIn } = useAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 mobile-fit-screen">
      {/* Career Connect Title - Smaller on mobile */}
      <div className="text-center mb-4 sm:mb-12 px-4 mobile-tight">
        <h1 className="text-[#1e293b] text-3xl sm:text-5xl font-bold tracking-tight mb-2">
          Alumni Meet 2.0
        </h1>
        <p className="text-slate-600 text-sm sm:text-lg font-medium max-w-md">
          Your gateway to professional opportunities
        </p>
      </div>

      <div className="login-card w-full max-w-[440px] rounded-[1.5rem] sm:rounded-[3rem] shadow-[0_12px_24px_-6px_rgba(0,0,0,0.1)] sm:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-5 sm:p-12 flex flex-col items-center mobile-compact">

        {/* Illustration */}
        <div className="w-full max-w-[140px] sm:max-w-[240px] aspect-square mb-4 sm:mb-6 flex items-center justify-center">
          <img
            src="https://illustrations.popsy.co/blue/abstract-art-6.svg"
            alt="Career Connect Illustration"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Sign In section */}
        <div className="text-center mb-4 sm:mb-8">
          <h2 className="text-[#1e293b] text-xl sm:text-3xl font-bold tracking-tight mb-1">
            Sign In
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">
            Enter your roll no and password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">

          {/* Roll Number field */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 sm:left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              name="rollNo"
              placeholder="Roll Number"
              value={formData.rollNo}
              onChange={handleChange}
              required
              className="w-full pl-10 sm:pl-14 pr-3 sm:pr-6 py-2.5 sm:py-4 bg-slate-50 border border-transparent rounded-lg sm:rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium text-sm sm:text-base"
            />
          </div>

          {/* Password field */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 sm:left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full pl-10 sm:pl-14 pr-3 sm:pr-6 py-2.5 sm:py-4 bg-slate-50 border border-transparent rounded-lg sm:rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium text-sm sm:text-base"
            />
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            className="w-full py-2.5 sm:py-4 mt-1 bg-blue-600 text-white font-bold rounded-lg sm:rounded-2xl shadow-md sm:shadow-lg shadow-blue-200 hover:bg-blue-700 active:transform active:scale-[0.98] transition-all text-sm sm:text-lg"
          >
            Sign In
          </button>
        </form>



      </div>

      {/* Footer */}
      <div className="mt-4 sm:mt-8 px-4 text-center">
        <p className="text-slate-500 text-xs max-w-md">
          &copy; 2026 Alumni Meet. Connect with opportunities that matter.
        </p>
      </div>
    </div>
  );
};

export default Login;