import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <header className="h-16 glass-panel border-b border-x-0 border-t-0 sticky top-0 z-30 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle would go here */}
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
