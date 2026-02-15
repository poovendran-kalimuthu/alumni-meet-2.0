// AttendanceForm.jsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { ToastContainer, toast } from 'react-toastify';

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [userLocation, setUserLocation] = useState(null);
  const [distanceFromVenue, setDistanceFromVenue] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationDetails, setLocationDetails] = useState(null);


  const { authUser } = useAuthStore();

  // Event location coordinates
  const EVENT_LOCATION = {
    lat:10.968700,
    lng: 76.946300
  };

  // Premises radius in meters
  const PREMISES_RADIUS = 200;

  // Student information (would typically come from props or API)
  const studentInfo = {
    name: authUser.name,
    rollNo: authUser.rollNo,
    className: authUser.className
  };
  console.log(authUser);

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

    return R * c; // Distance in meters
  };

  // Get user's current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0
        }
      );
    });
  };

  // Verify location and validate with backend
  const verifyLocation = async () => {
    setLocationStatus('checking');
    setLocationDetails(null);

    try {
      const location = await getCurrentLocation();

      const distance = calculateDistance(
        location.lat,
        location.lng,
        EVENT_LOCATION.lat,
        EVENT_LOCATION.lng
      );

      setUserLocation({
        lat: location.lat,
        lng: location.lng
      });

      setDistanceFromVenue(distance);

      // Only frontend validation
      if (distance <= PREMISES_RADIUS) {
        setLocationStatus('verified');
        setLocationDetails({
          coordinates: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
          distance: `${distance.toFixed(0)} meters`,
          withinRadius: 'Yes ✓'
        });
      } else {
        setLocationStatus('not-verified');
        setLocationDetails({
          coordinates: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
          distance: `${distance.toFixed(0)} meters`,
          withinRadius: 'No ✗',
          errorMessage: `You are ${distance.toFixed(0)}m away from venue`
        });
      }

    } catch (error) {
      console.error('Location error:', error);
      setLocationStatus('not-verified');
      setLocationDetails({
        errorMessage: 'Unable to access location'
      });
    }
  };


  // Validate location with backend API
  
  // Handle form submission
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (locationStatus !== 'verified') {
    alert('Please verify your location first');
    return;
  }

  setIsSubmitting(true);

  try {
    const payload = {
      studentId: authUser._id,   // or rollNo
      event: "Alumni Meet - 2026",
      userLocation: {
        lat: userLocation.lat,
        lng: userLocation.lng
      },
      eventLocation: EVENT_LOCATION,
      radius: PREMISES_RADIUS,
      studentInfo: {
        name: studentInfo.name,
        rollNo: studentInfo.rollNo,
        className: studentInfo.className
      }
    };

    const response = await fetch('https://alumni-meet-2-0.onrender.com/api/auth/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Attendance failed");
    }

    toast.success("Attendance Posted Successfully")

  } catch (error) {
    console.error(error);
    alert(error.message || "❌ Attendance failed");
  } finally {
    setIsSubmitting(false);
  }
};


  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="space-y-4 transition-all duration-500">
      <div className="skeleton h-8 w-36 mx-auto mb-4 rounded-full"></div>
      <div>
        <div className="skeleton h-3 w-20 mb-2 rounded-lg"></div>
        <div className="skeleton h-12 w-full rounded-xl"></div>
      </div>
      <div>
        <div className="skeleton h-3 w-24 mb-2 rounded-lg"></div>
        <div className="skeleton h-12 w-full rounded-xl"></div>
      </div>
      <div>
        <div className="skeleton h-3 w-16 mb-2 rounded-lg"></div>
        <div className="skeleton h-12 w-full rounded-xl"></div>
      </div>
      <div className="skeleton h-32 w-full rounded-xl mt-4"></div>
      <div className="skeleton h-14 w-full rounded-xl mt-6"></div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="glass-card w-full max-w-md rounded-[2rem] p-8">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="glass-card w-full max-w-md rounded-[2rem] p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-[#1e293b] text-2xl font-bold tracking-tight mb-1 font-primary">
            Post Attendance
          </h1>
          <p className="text-slate-400 text-xs font-medium font-secondary">
            Alumni Meet 2.0 - Event Check-in
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Student Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 font-primary border-b pb-2">
              Student Information
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-slate-600 text-xs font-medium mb-1.5 font-secondary">
                  Name
                </label>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-800 text-sm font-medium font-secondary">
                    {studentInfo.name}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-xs font-medium mb-1.5 font-secondary">
                    Roll No
                  </label>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-slate-800 text-sm font-medium font-secondary">
                      {studentInfo.rollNo}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 text-xs font-medium mb-1.5 font-secondary">
                    Class
                  </label>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-slate-800 text-sm font-medium font-secondary">
                      {studentInfo.className}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 font-primary border-b pb-2">
              Event Details
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-800 font-primary mb-1">
                    Alumni Meet 2.0
                  </h4>
                  <div className="space-y-1 text-xs text-slate-600 font-secondary">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span>Electrical Seminar Hall</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Today, 3.00 PM - 4:30 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Verification */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 font-primary border-b pb-2">
              Location Verification
            </h3>
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
              {/* Location Status Display */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${locationStatus === 'verified' ? 'bg-green-100' :
                      locationStatus === 'not-verified' ? 'bg-red-100' :
                        locationStatus === 'checking' ? 'bg-yellow-100' : 'bg-slate-100'
                    }`}>
                    {locationStatus === 'verified' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : locationStatus === 'not-verified' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : locationStatus === 'checking' ? (
                      <svg className="animate-spin h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 font-primary">
                      Location Status
                    </h4>
                    <p className={`text-xs font-secondary ${locationStatus === 'verified' ? 'text-green-600' :
                        locationStatus === 'not-verified' ? 'text-red-600' :
                          locationStatus === 'checking' ? 'text-yellow-600' : 'text-slate-500'
                      }`}>
                      {locationStatus === 'verified' ? 'You are within the event premises' :
                        locationStatus === 'not-verified' ? (locationDetails?.errorMessage || 'Tap to verify your location') :
                          locationStatus === 'checking' ? 'Checking location within premises...' :
                            'Tap to verify your location'}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${locationStatus === 'verified' ? 'bg-green-100 text-green-700' :
                    locationStatus === 'not-verified' ? 'bg-red-100 text-red-700' :
                      locationStatus === 'checking' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                  {locationStatus === 'verified' ? 'Verified' :
                    locationStatus === 'not-verified' ? 'Not Verified' :
                      locationStatus === 'checking' ? 'Checking...' : 'Pending'}
                </div>
              </div>

              {/* Premises Condition */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs text-blue-700 font-secondary mb-1">
                      <span className="font-semibold">Location Premises:</span> You must be within 100 meters of the event venue
                    </p>
                    <div className="text-xs text-blue-600 font-mono bg-blue-100 px-2 py-1 rounded inline-block mt-1">
                      Lat: {EVENT_LOCATION.lat} | Lng: {EVENT_LOCATION.lng}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Button */}
              <button
                type="button"
                onClick={verifyLocation}
                disabled={locationStatus === 'checking'}
                className={`w-full py-3 text-white font-semibold rounded-xl transition-all text-sm font-primary flex items-center justify-center gap-2 ${locationStatus === 'verified'
                    ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                    : locationStatus === 'not-verified'
                      ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                  } ${locationStatus === 'checking' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {locationStatus === 'verified' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Location Verified ✓
                  </>
                ) : locationStatus === 'not-verified' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Try Again
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    Verify My Location
                  </>
                )}
              </button>

              {/* Location Details */}
              {locationDetails && locationDetails.coordinates && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-secondary">Your Coordinates:</span>
                    <span className="font-medium text-slate-800 font-primary">
                      {locationDetails.coordinates}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-secondary">Distance from venue:</span>
                    <span className="font-medium text-slate-800 font-primary">
                      {locationDetails.distance}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-secondary">Within 100m radius:</span>
                    <span className={`font-medium font-primary ${locationDetails.withinRadius === 'Yes ✓' ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {locationDetails.withinRadius}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={locationStatus !== 'verified' || isSubmitting}
            className={`w-full py-3.5 mt-2 font-bold rounded-xl transition-all text-base font-primary ${locationStatus === 'verified'
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-200'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white mx-auto inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Location verification is mandatory for attendance posting</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;  