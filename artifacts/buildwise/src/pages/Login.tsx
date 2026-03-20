import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0f1c2e] flex-col justify-between p-12 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#c4a747] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#1b3a6b] rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
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
            <h1 className="text-4xl font-bold text-white leading-tight">
              Manage projects.<br />
              <span className="text-[#c4a747]">Drive results.</span>
            </h1>
            <p className="mt-4 text-slate-400 text-lg leading-relaxed">
              BuildWise brings your entire project portfolio, vendor pipeline and AI-powered insights into one powerful platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Active Projects", value: "16+" },
              { label: "Vendors Managed", value: "3+" },
              { label: "Tasks Tracked", value: "120+" },
              { label: "AI Insights", value: "Daily" },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center bg-[#0a1628] px-6 py-12">
        <div className="w-full max-w-md space-y-8">
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
            <h2 className="text-3xl font-bold text-white">Welcome back</h2>
            <p className="mt-2 text-slate-400">Sign in to your BuildWise account</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@firstregistrars.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c4a747]/50 focus:border-[#c4a747]/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c4a747]/50 focus:border-[#c4a747]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1b3a6b] hover:bg-[#1b3a6b]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border border-[#c4a747]/30 hover:border-[#c4a747]/60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
