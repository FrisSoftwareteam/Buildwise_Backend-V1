import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Lock, Mail, User, Building2, AlertCircle, CheckCircle2 } from "lucide-react";

const DEPARTMENTS = [
  "Management",
  "Technology",
  "Operations",
  "Investor Services",
  "Finance",
  "Legal & Compliance",
  "Human Resources",
  "Business Development",
  "Registry Services",
];

const ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Project Manager" },
  { value: "developer", label: "Team Member" },
  { value: "viewer", label: "Viewer (Read Only)" },
];

export default function Signup() {
  const { signup } = useAuth();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    role: "developer",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][passwordStrength];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match");
    }
    if (form.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }
    if (!form.department) {
      return setError("Please select your department");
    }

    setLoading(true);
    try {
      await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        department: form.department,
        role: form.role,
      });
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-[#0f1c2e] flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#c4a747] rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1b3a6b] rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="bg-white rounded-xl px-6 py-4 inline-block">
            <img
              src={`${import.meta.env.BASE_URL}images/firstregistrars-logo.png`}
              alt="First Registrars"
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight">
              Join the team on<br />
              <span className="text-[#c4a747]">BuildWise</span>
            </h1>
            <p className="mt-4 text-slate-400 leading-relaxed">
              Create your account to collaborate on projects, track vendor pipelines, and access AI-powered business insights.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Manage internal and vendor projects",
              "Track project stages and completion",
              "AI business analysis and advice",
              "Real-time team collaboration",
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#c4a747] shrink-0" />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-[#0a1628] px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-7">
          {/* Branded header */}
          <div className="flex items-center gap-4 pb-6 border-b border-white/10">
            <div className="bg-white rounded-xl px-4 py-2 shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}images/firstregistrars-logo.png`}
                alt="First Registrars"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c4a747]">First Registrars</p>
              <p className="text-lg font-bold text-white leading-tight">BuildWise</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white">Create your account</h2>
            <p className="mt-2 text-slate-400">Get started with BuildWise today</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => update("name", e.target.value)}
                  placeholder="Chukwuemeka Obi"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c4a747]/50 focus:border-[#c4a747]/50 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => update("email", e.target.value)}
                  placeholder="you@firstregistrars.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c4a747]/50 focus:border-[#c4a747]/50 transition-all"
                />
              </div>
            </div>

            {/* Department + Role */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Department</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  <select
                    required
                    value={form.department}
                    onChange={e => update("department", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#c4a747]/50 focus:border-[#c4a747]/50 transition-all appearance-none"
                  >
                    <option value="" className="bg-[#0f1c2e]">Select...</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d} className="bg-[#0f1c2e]">{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Role</label>
                <select
                  value={form.role}
                  onChange={e => update("role", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#c4a747]/50 focus:border-[#c4a747]/50 transition-all appearance-none"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value} className="bg-[#0f1c2e]">{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={e => update("password", e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c4a747]/50 focus:border-[#c4a747]/50 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor : "bg-white/10"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">{strengthLabel}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={form.confirmPassword}
                  onChange={e => update("confirmPassword", e.target.value)}
                  placeholder="Repeat your password"
                  className={`w-full bg-white/5 border rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    form.confirmPassword && form.confirmPassword !== form.password
                      ? "border-red-500/50 focus:ring-red-500/30"
                      : "border-white/10 focus:ring-[#c4a747]/50 focus:border-[#c4a747]/50"
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1b3a6b] hover:bg-[#1b3a6b]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 border border-[#c4a747]/30 hover:border-[#c4a747]/60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : "Create Account"}
            </button>
          </form>

          <div className="text-center">
            <span className="text-slate-500 text-sm">Already have an account? </span>
            <a
              href="#"
              onClick={e => { e.preventDefault(); setLocation("/login"); }}
              className="text-[#c4a747] hover:text-[#c4a747]/80 text-sm font-medium transition-colors"
            >
              Sign in
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
