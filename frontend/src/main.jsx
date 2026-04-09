// DIAGNOSTIC ALERT: This proves where the URL is coming from
if (typeof window !== "undefined") {
    console.log("Current VITE_API_URL:", import.meta.env.VITE_API_URL || "FALLBACK USED");
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  
    <App />
  

)
