import React, { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import { useAuthStore } from './store/useAuthStore'
import { Toaster } from 'react-hot-toast'
import { Loader } from 'lucide-react'
import AdminLogin from './pages/AdminPage'
import AdminDashboard from './pages/AdminDashboard'
import { ToastContainer, toast } from 'react-toastify';
import FeedbackPage from './pages/FeedbackPage'

const App = () => {
  const { authUser, isCheckingAuth, checkAuth } = useAuthStore();
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/session/:sessionId" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/signup" element={!authUser ? <SignupPage /> : <Navigate to="/" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/portal/admin" element={<AdminLogin />} />
          <Route path="/portal/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/feedback" element={<FeedbackPage />} />

        </Routes>
        <ToastContainer style={{ fontFamily: "'Space Grotesk', sans-serif" }} />
      </BrowserRouter>
      <Toaster toastOptions={{
        style: {
          fontFamily: "'Space Grotesk', sans-serif",
        }
      }} />
    </div>
  )
}

export default App
