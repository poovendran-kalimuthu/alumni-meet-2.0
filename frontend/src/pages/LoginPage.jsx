import React, { useState } from 'react';
import '../login.css';
import { useAuthStore } from '../store/useAuthStore.js';
import toast from "react-hot-toast";

const Login = () => {
  const [formData, setFormData] = useState({
    rollNo: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { login, isLoggingIn } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.rollNo.trim()) {
      newErrors.rollNo = 'Roll number is required';
    } else if (formData.rollNo.length < 3) {
      newErrors.rollNo = 'Roll number must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix the errors in the form', {
        position: "top-center",
      });
      return;
    }

    setIsLoading(true);

    try {
      // TRANSFORM DATA HERE: 
      // Convert rollNo to Uppercase before sending to the backend
      const submissionData = {
        ...formData,
        rollNo: formData.rollNo.toUpperCase().trim()
      };

      await login(submissionData);

    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.', {
        position: "top-center",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50">

        {/* Career Connect Title */}
        <div className="text-center mb-3 sm:mb-6 md:mb-12 px-3 sm:px-4 w-full max-w-md">
          <h1 className="text-[#1e293b] text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-1 sm:mb-2">
            Building Young minds to Entreprenuers
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm md:text-lg font-medium">
            Your gateway to professional opportunities
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card w-full max-w-[320px] sm:max-w-[380px] md:max-w-[440px] rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] shadow-lg sm:shadow-xl md:shadow-2xl p-5 sm:p-8 md:p-12 bg-white/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">

          {/* Illustration */}
          <div className="w-full max-w-[100px] sm:max-w-[140px] md:max-w-[200px] lg:max-w-[240px] mx-auto aspect-square mb-3 sm:mb-4 md:mb-6 flex items-center justify-center">
            <img
              src="https://illustrations.popsy.co/blue/abstract-art-6.svg"
              alt="Career Connect Illustration"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Sign In section */}
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-[#1e293b] text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight mb-0.5 sm:mb-1">
              Sign In
            </h2>
            <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm font-medium">
              Enter your roll no and password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 sm:gap-4">

            {/* Roll Number field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 sm:left-4 md:left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
                className={`w-full pl-8 sm:pl-10 md:pl-14 pr-3 sm:pr-4 md:pr-6 py-2 sm:py-2.5 md:py-4 bg-slate-50 border ${errors.rollNo ? 'border-red-300 bg-red-50' : 'border-transparent'
                  } rounded-lg sm:rounded-xl md:rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium text-xs sm:text-sm md:text-base`}
              />
              {errors.rollNo && (
                <p className="text-[8px] sm:text-[10px] md:text-xs text-red-500 mt-0.5 sm:mt-1 ml-1">
                  {errors.rollNo}
                </p>
              )}
            </div>

            {/* Password field with eye toggle */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 sm:left-4 md:left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`w-full pl-8 sm:pl-10 md:pl-14 pr-8 sm:pr-10 md:pr-12 py-2 sm:py-2.5 md:py-4 bg-slate-50 border ${errors.password ? 'border-red-300 bg-red-50' : 'border-transparent'
                  } rounded-lg sm:rounded-xl md:rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium text-xs sm:text-sm md:text-base`}
              />

              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-2 sm:right-3 md:right-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>

              {errors.password && (
                <p className="text-[8px] sm:text-[10px] md:text-xs text-red-500 mt-0.5 sm:mt-1 ml-1">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || isLoggingIn}
              className={`w-full py-2.5 sm:py-3 md:py-4 mt-1 sm:mt-2 md:mt-3 bg-blue-600 text-white font-bold rounded-lg sm:rounded-xl md:rounded-2xl shadow-md sm:shadow-lg shadow-blue-200 hover:bg-blue-700 active:transform active:scale-[0.98] transition-all text-sm sm:text-base md:text-lg ${(isLoading || isLoggingIn) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
            >
              {isLoading || isLoggingIn ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Additional Options */}
          <div className="mt-4 sm:mt-6 md:mt-8 text-center">
            <p className="text-slate-500 text-[10px] sm:text-xs md:text-sm">
              Error in Logging In ?{' '}
              <button
                type="button"
                onClick={() => toast.error('Contact Coordinators for queries !', {
                  position: "top-center",
                })}
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                Contact Event coordinators
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 sm:mt-6 md:mt-8 px-4 text-center">
          <p className="text-slate-500 text-[10px] sm:text-xs max-w-md">
            &copy; 2026 Alumni Meet. Connect with opportunities that matter.
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;