import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const userRoleLabel = user?.roles?.length
    ? user.roles.join(" • ")
    : user?.role || "member";

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const initials = user?.name?.split(" ").map(n => n[0]).slice(0, 2).join("") || "FR";

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <header className="h-16 glass-panel border-b border-x-0 border-t-0 sticky top-0 z-30 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-medium text-slate-200 capitalize">
              {location === '/' ? 'Dashboard Overview' : location.split('/')[1].replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search anything..."
                className="w-64 h-9 bg-black/20 border border-white/10 rounded-full px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-white/10" />

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white leading-tight">{user?.name || "User"}</p>
                <p className="text-xs text-slate-400">{userRoleLabel}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#1b3a6b] to-[#2a5298] border border-[#c4a747]/40 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}
