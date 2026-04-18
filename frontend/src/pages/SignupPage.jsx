import { useState } from "react"
import { useAuthStore } from "../store/useAuthStore"
import { User, Lock, Loader2, Fingerprint, GraduationCap, School, BookOpen, Layers } from "lucide-react"
import { Link } from "react-router-dom"
import AuthImagePattern from "../components/AuthImagePattern"
import toast from "react-hot-toast"

const SignupPage = () => {
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        rollNo: "",
        name: "",
        className: "",
        year: "",
        department: "",
        password: ""
    })

    const { signup, isSigningUp } = useAuthStore();

    const validateform = () => {
        if (!formData.rollNo.trim()) return toast.error("Roll Number is required");
        if (!formData.name.trim()) return toast.error("Full Name is required");
        if (!formData.className.trim()) return toast.error("Class Name is required");
        if (!formData.year.trim()) return toast.error("Year of Study is required");
        if (!formData.department.trim()) return toast.error("Department is required");
        if (!formData.password) return toast.error("Password is required");
        if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
        return true;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        const formResponse = validateform();
        if (formResponse === true) {
            signup(formData);
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2 font-secondary bg-white">
            {/* Left Side */}
            <div className="flex flex-col justify-center items-center p-6 sm:p-12">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center mb-8">
                        <div className="flex flex-col items-center gap-2 group">
                            <div className="size-12 rounded-xl bg-indigo-600/10 flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors">
                                <GraduationCap className="size-6 text-indigo-600" />
                            </div>
                            <h1 className="text-2xl font-primary font-bold mt-2 text-slate-900">Student Enrollment</h1>
                            <p className="text-slate-500 text-sm">
                                Create your profile to start verification
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs uppercase tracking-wider text-slate-400">Roll Number</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Fingerprint className="size-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-indigo-500 text-sm font-medium"
                                        placeholder="e.g. 21CS001"
                                        value={formData.rollNo}
                                        onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs uppercase tracking-wider text-slate-400">Full Name</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="size-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-indigo-500 text-sm font-medium"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs uppercase tracking-wider text-slate-400">Class Label</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Layers className="size-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-indigo-500 text-sm font-medium"
                                        placeholder="e.g. CSE-A"
                                        value={formData.className}
                                        onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs uppercase tracking-wider text-slate-400">Section/Year</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <School className="size-4 text-slate-400" />
                                    </div>
                                    <select
                                        className="select select-bordered w-full pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-indigo-500 text-sm font-medium"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    >
                                        <option value="">Select Year</option>
                                        <option value="1st Year">1st Year</option>
                                        <option value="2nd Year">2nd Year</option>
                                        <option value="3rd Year">3rd Year</option>
                                        <option value="4th Year">4th Year</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-bold text-xs uppercase tracking-wider text-slate-400">Field of Study (Dept)</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <BookOpen className="size-4 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    className="input input-bordered w-full pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-indigo-500 text-sm font-medium"
                                    placeholder="e.g. CSE, ECE, MECH"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-bold text-xs uppercase tracking-wider text-slate-400">Security Key</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="size-4 text-slate-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input input-bordered w-full pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-indigo-500 text-sm font-medium"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <Layers className="size-4 text-slate-400" />
                                    ) : (
                                        <Layers className="size-4 text-slate-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-12 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 mt-4" 
                            disabled={isSigningUp}
                        >
                            {isSigningUp ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Onboarding...
                                </>
                            ) : (
                                "Initialize Participant Profile"
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-2">
                        <p className="text-slate-500 text-sm">
                            Already registered?{" "}
                            <Link to="/login" className="text-indigo-600 font-bold hover:underline">
                                Authorize Identity
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <AuthImagePattern
                title="Synchronized Verification"
                subtitle="Join the most advanced geo-fenced attendance network designed for institutional efficiency." 
            />
        </div>
    )
}

export default SignupPage