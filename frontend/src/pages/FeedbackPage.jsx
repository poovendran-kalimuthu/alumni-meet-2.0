import { useAuthStore } from "../store/useAuthStore";
import axios from "axios";
import { useState } from "react";


const FeedbackPage = ({ eventId }) => {
  const { authUser } = useAuthStore();

  const [form, setForm] = useState({
    experience: "",
    organization: "",
    communication: "",
    venue: "",
    engagement: 5,
    networking: "",
    duration: "",
    highlight: "",
    topics: "",
    support: "",
    future: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const apiUrl = import.meta.env.VITE_API_URL || "https://alumni-meet-2-0.onrender.com/api";
    await axios.post(
      `${apiUrl}/feedback`,
      { ...form, event: eventId, name: authUser?.name },
      { withCredentials: true }
    );

    alert("Feedback submitted ❤️");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* USER NAME AUTO */}
      <input value={authUser?.name || "Guest"} readOnly className="input-field p-3" />

      <select onChange={(e) => setForm({ ...form, experience: e.target.value })}>
        <option>Excellent</option>
        <option>Good</option>
      </select>

      <textarea
        placeholder="Highlight"
        onChange={(e) => setForm({ ...form, highlight: e.target.value })}
      />

      <button className="bg-indigo-600 px-6 py-3 rounded-xl">
        Submit Feedback
      </button>
    </form>
  );
};

export default FeedbackPage;
