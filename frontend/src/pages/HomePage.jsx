// HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [userLocation, setUserLocation] = useState(null);
  const [distanceFromVenue, setDistanceFromVenue] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationDetails, setLocationDetails] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [gpsInstructions, setGpsInstructions] = useState(false);

  const { authUser } = useAuthStore();

  // Event location coordinates
  const EVENT_LOCATION = {
    lat: 10.654501,
    lng: 77.035866
  };

  // Premises radius in meters
  const PREMISES_RADIUS = 300;

  // Student information
  const studentInfo = {
    name: authUser?.name || 'N/A',
    rollNo: authUser?.rollNo || 'N/A',
    className: authUser?.className || 'N/A'
  };

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Get user's current location with improved error handling
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported on this device"));
        return;
      }

      // Show GPS instructions for first attempt
      setGpsInstructions(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          setGpsInstructions(false);
          setPermissionDenied(false);

          // Check accuracy and provide feedback
          if (accuracy > 100) {
            // Still resolve but with warning
            resolve({
              lat: latitude,
              lng: longitude,
              accuracy,
              warning: "Low GPS accuracy. For better results, move to an open area."
            });
          } else {
            resolve({
              lat: latitude,
              lng: longitude,
              accuracy
            });
          }
        },
        (error) => {
          setGpsInstructions(false);
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setPermissionDenied(true);
              reject(new Error("Location access denied. Please enable location in your browser settings."));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error("Location unavailable. Check your GPS signal."));
              break;
            case error.TIMEOUT:
              reject(new Error("Location request timed out. Please try again."));
              break;
            default:
              reject(new Error("Unable to fetch location. Please try again."));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        }
      );
    });
  };

  // Verify location and validate
  const verifyLocation = async () => {
    if (locationStatus === "checking") return;

    setLocationStatus("checking");
    setLocationDetails(null);
    setPermissionDenied(false);
    setRetryCount(0);

    const attemptLocation = async (attempt = 0) => {
      try {
        const location = await getCurrentLocation();

        const distance = calculateDistance(
          location.lat,
          location.lng,
          EVENT_LOCATION.lat,
          EVENT_LOCATION.lng
        );

        setUserLocation(location);
        setDistanceFromVenue(distance);

        // Show accuracy warning if applicable
        if (location.warning) {
          toast.warning(location.warning, {
            position: "top-center",
            autoClose: 5000,
          });
        }

        if (distance <= PREMISES_RADIUS) {
          setLocationStatus("verified");
          setLocationDetails({
            coordinates: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
            distance: `${distance.toFixed(0)} meters`,
            accuracy: location.accuracy ? `${location.accuracy.toFixed(0)} meters` : 'N/A',
            withinRadius: "Yes ✓"
          });
          toast.success("✅ Location verified! You can now post attendance.", {
            position: "top-center",
            autoClose: 3000,
          });
        } else {
          setLocationStatus("not-verified");
          setLocationDetails({
            coordinates: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
            distance: `${distance.toFixed(0)} meters`,
            accuracy: location.accuracy ? `${location.accuracy.toFixed(0)} meters` : 'N/A',
            withinRadius: "No ✗",
            errorMessage: `You are ${distance.toFixed(0)}m away from venue. Required: within ${PREMISES_RADIUS}m`
          });
          toast.error(`❌ You're too far from the venue (${distance.toFixed(0)}m away)`, {
            position: "top-center",
            autoClose: 4000,
          });
        }

      } catch (err) {
        if (attempt < 2) {
          setRetryCount(attempt + 1);
          setTimeout(() => attemptLocation(attempt + 1), 3000);
        } else {
          setLocationStatus("not-verified");
          setLocationDetails({
            errorMessage: err.message
          });
          toast.error(err.message, {
            position: "top-center",
            autoClose: 5000,
          });
        }
      }
    };

    attemptLocation();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (locationStatus !== 'verified') {
      toast.warning("Please verify your location first", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (!userLocation) {
      toast.error("Location data missing. Please verify again.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        studentId: authUser?._id || authUser?.id,
        event: "Alumni Meet - 2026",
        userLocation: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          accuracy: userLocation.accuracy
        },
        eventLocation: EVENT_LOCATION,
        radius: PREMISES_RADIUS,
        distance: distanceFromVenue,
        studentInfo: {
          name: studentInfo.name,
          rollNo: studentInfo.rollNo,
          className: studentInfo.className
        },
        timestamp: new Date().toISOString()
      };

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      

      const response = await fetch('https://alumni-meet-2-0.onrender.com/api/auth/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Attendance posting failed");
      }

      toast.success("✅ Attendance Posted Successfully!", {
        position: "top-center",
        autoClose: 5000,
        onClose: () => {
          // Optional: redirect or reset form
          setLocationStatus('pending');
          setUserLocation(null);
          setLocationDetails(null);
        }
      });

    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || "❌ Failed to post attendance", {
        position: "top-center",
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open location settings helper
  const openLocationSettings = () => {
    if (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
      window.location.href = "app-settings:";
    } else {
      toast.info("Please enable location in your browser/device settings", {
        position: "top-center",
        autoClose: 5000,
      });
    }
  };

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="space-y-3 sm:space-y-4 animate-pulse">
      <div className="skeleton h-7 sm:h-8 w-32 sm:w-36 mx-auto mb-3 sm:mb-4 rounded-full bg-slate-200"></div>
      <div>
        <div className="skeleton h-2 sm:h-3 w-16 sm:w-20 mb-1.5 sm:mb-2 rounded-lg bg-slate-200"></div>
        <div className="skeleton h-10 sm:h-12 w-full rounded-xl bg-slate-200"></div>
      </div>
      <div>
        <div className="skeleton h-2 sm:h-3 w-20 sm:w-24 mb-1.5 sm:mb-2 rounded-lg bg-slate-200"></div>
        <div className="skeleton h-10 sm:h-12 w-full rounded-xl bg-slate-200"></div>
      </div>
      <div>
        <div className="skeleton h-2 sm:h-3 w-14 sm:w-16 mb-1.5 sm:mb-2 rounded-lg bg-slate-200"></div>
        <div className="skeleton h-10 sm:h-12 w-full rounded-xl bg-slate-200"></div>
      </div>
      <div className="skeleton h-28 sm:h-32 w-full rounded-xl mt-3 sm:mt-4 bg-slate-200"></div>
      <div className="skeleton h-12 sm:h-14 w-full rounded-xl mt-4 sm:mt-6 bg-slate-200"></div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-3 sm:p-4 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="glass-card w-full max-w-[360px] sm:max-w-md rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 bg-white/80 backdrop-blur-lg shadow-xl">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        className="text-xs sm:text-sm"
      />
      
      <div className="flex items-center justify-center min-h-screen p-3 sm:p-4 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="glass-card w-full max-w-[360px] sm:max-w-md rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 bg-white/80 backdrop-blur-lg shadow-xl transition-all duration-300 hover:shadow-2xl">
          
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-[#1e293b] text-xl sm:text-2xl font-bold tracking-tight mb-0.5 sm:mb-1 font-primary">
              Post Attendance
            </h1>
            <p className="text-slate-400 text-[10px] sm:text-xs font-medium font-secondary">
              Alumni Meet 2.0 - Event Check-in
            </p>
          </div>

          <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
            {/* Student Information */}
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 font-primary border-b pb-1.5 sm:pb-2 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Student Information
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                <div>
                  <label className="block text-slate-600 text-[10px] sm:text-xs font-medium mb-1 sm:mb-1.5 font-secondary">
                    Name
                  </label>
                  <div className="bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-200">
                    <p className="text-slate-800 text-xs sm:text-sm font-medium font-secondary truncate">
                      {studentInfo.name}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-slate-600 text-[10px] sm:text-xs font-medium mb-1 sm:mb-1.5 font-secondary">
                      Roll No
                    </label>
                    <div className="bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-200">
                      <p className="text-slate-800 text-xs sm:text-sm font-medium font-secondary truncate">
                        {studentInfo.rollNo}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] sm:text-xs font-medium mb-1 sm:mb-1.5 font-secondary">
                      Class
                    </label>
                    <div className="bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-200">
                      <p className="text-slate-800 text-xs sm:text-sm font-medium font-secondary truncate">
                        {studentInfo.className}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 font-primary border-b pb-1.5 sm:pb-2 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Event Details
              </h3>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-100">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800 font-primary mb-0.5 sm:mb-1">
                      Alumni Meet 2.0
                    </h4>
                    <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-slate-600 font-secondary">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="truncate">Electrical Seminar Hall</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="truncate">Today, 3:00 PM - 4:30 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Verification */}
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 font-primary border-b pb-1.5 sm:pb-2 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Location Verification
              </h3>
              
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                
                {/* GPS Instructions */}
                {gpsInstructions && (
                  <div className="mb-3 p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-[10px] sm:text-xs text-yellow-700 animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-medium">Getting your location...</span>
                    </div>
                    <p className="mt-1 ml-5">For best results, ensure you're in an open area with GPS enabled.</p>
                  </div>
                )}

                {/* Permission Denied Message */}
                {permissionDenied && (
                  <div className="mb-3 p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200 text-[10px] sm:text-xs">
                    <div className="flex items-start gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="font-medium text-red-700">Location access denied</p>
                        <p className="text-red-600 mt-0.5">Please enable location in your browser/device settings</p>
                        <button
                          type="button"
                          onClick={openLocationSettings}
                          className="mt-2 text-red-700 font-medium underline"
                        >
                          How to enable
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Status Display */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                      locationStatus === 'verified' ? 'bg-green-100' :
                      locationStatus === 'not-verified' ? 'bg-red-100' :
                      locationStatus === 'checking' ? 'bg-yellow-100' : 'bg-slate-100'
                    }`}>
                      {locationStatus === 'verified' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : locationStatus === 'not-verified' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : locationStatus === 'checking' ? (
                        <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-800 font-primary">
                        Location Status
                      </h4>
                      <p className={`text-[10px] sm:text-xs font-secondary truncate ${
                        locationStatus === 'verified' ? 'text-green-600' :
                        locationStatus === 'not-verified' ? 'text-red-600' :
                        locationStatus === 'checking' ? 'text-yellow-600' : 'text-slate-500'
                      }`}>
                        {locationStatus === 'verified' ? 'Within event premises' :
                         locationStatus === 'not-verified' ? (locationDetails?.errorMessage || 'Tap to verify') :
                         locationStatus === 'checking' ? 'Verifying location...' :
                         'Tap to verify your location'}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg flex-shrink-0 ${
                    locationStatus === 'verified' ? 'bg-green-100 text-green-700' :
                    locationStatus === 'not-verified' ? 'bg-red-100 text-red-700' :
                    locationStatus === 'checking' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {locationStatus === 'verified' ? 'Verified' :
                     locationStatus === 'not-verified' ? 'Not Verified' :
                     locationStatus === 'checking' ? 'Checking...' : 'Pending'}
                  </div>
                </div>

                {/* Premises Condition */}
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-[10px] sm:text-xs text-blue-700 font-secondary">
                        <span className="font-semibold">Required:</span> Within {PREMISES_RADIUS}m of venue
                      </p>
                      <div className="text-[8px] sm:text-[10px] text-blue-600 font-mono bg-blue-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded inline-block mt-1">
                        {EVENT_LOCATION.lat.toFixed(4)}, {EVENT_LOCATION.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retry Counter */}
                {retryCount > 0 && (
                  <div className="mb-2 text-[10px] sm:text-xs text-center text-slate-500">
                    Retrying... Attempt {retryCount}/3
                  </div>
                )}

                {/* Verification Button */}
                <button
                  type="button"
                  onClick={verifyLocation}
                  disabled={locationStatus === 'checking'}
                  className={`w-full py-2.5 sm:py-3 text-white font-semibold rounded-lg sm:rounded-xl transition-all text-xs sm:text-sm font-primary flex items-center justify-center gap-1.5 sm:gap-2 ${
                    locationStatus === 'verified'
                      ? 'bg-green-500 hover:bg-green-600'
                      : locationStatus === 'not-verified'
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                  } ${locationStatus === 'checking' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {locationStatus === 'checking' ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking...
                    </>
                  ) : locationStatus === 'verified' ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verified ✓
                    </>
                  ) : locationStatus === 'not-verified' ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try Again
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      Verify My Location
                    </>
                  )}
                </button>

                {/* Location Details */}
                {locationDetails && (
                  <div className="mt-3 space-y-1.5 sm:space-y-2">
                    {locationDetails.coordinates && (
                      <div className="flex items-center justify-between text-[10px] sm:text-xs">
                        <span className="text-slate-600 font-secondary">Coordinates:</span>
                        <span className="font-medium text-slate-800 font-primary truncate ml-2">
                          {locationDetails.coordinates}
                        </span>
                      </div>
                    )}
                    {locationDetails.accuracy && (
                      <div className="flex items-center justify-between text-[10px] sm:text-xs">
                        <span className="text-slate-600 font-secondary">Accuracy:</span>
                        <span className="font-medium text-slate-800 font-primary">
                          {locationDetails.accuracy}
                        </span>
                      </div>
                    )}
                    {locationDetails.distance && (
                      <div className="flex items-center justify-between text-[10px] sm:text-xs">
                        <span className="text-slate-600 font-secondary">Distance:</span>
                        <span className="font-medium text-slate-800 font-primary">
                          {locationDetails.distance}
                        </span>
                      </div>
                    )}
                    {locationDetails.withinRadius && (
                      <div className="flex items-center justify-between text-[10px] sm:text-xs">
                        <span className="text-slate-600 font-secondary">Within radius:</span>
                        <span className={`font-medium font-primary ${
                          locationDetails.withinRadius === 'Yes ✓' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {locationDetails.withinRadius}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={locationStatus !== 'verified' || isSubmitting}
              className={`w-full py-3 sm:py-3.5 mt-1 sm:mt-2 font-bold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base font-primary ${
                locationStatus === 'verified'
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-200'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white mx-auto inline mr-1.5 sm:mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Posting...
                </>
              ) : locationStatus === 'verified' ? (
                'Post Attendance'
              ) : (
                'Verify Location First'
              )}
            </button>
          </form>

          {/* Information Footer */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500 font-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Location verification is mandatory for attendance posting</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;