import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Trello, 
  ListTodo, 
  Timer, 
  Briefcase, 
  GitMerge, 
  Users, 
  BrainCircuit, 
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, section: "Overview" },
  { label: "All Projects", href: "/projects", icon: FolderKanban, section: "Projects" },
  { label: "Board View", href: "/board", icon: Trello, section: "Projects" },
  { label: "Backlog", href: "/backlog", icon: ListTodo, section: "Projects" },
  { label: "Sprints", href: "/sprints", icon: Timer, section: "Projects" },
  { label: "Vendors", href: "/vendors", icon: Briefcase, section: "Vendors" },
  { label: "Pipeline", href: "/vendor-pipeline", icon: GitMerge, section: "Vendors" },
  { label: "Team", href: "/team", icon: Users, section: "Organization" },
  { label: "AI Advisor", href: "/ai-advisor", icon: BrainCircuit, section: "Intelligence", isAi: true },
  { label: "Settings", href: "/settings", icon: Settings, section: "Organization" },
];

export function Sidebar() {
  const [location] = useLocation();

  const sections = Array.from(new Set(NAV_ITEMS.map(i => i.section)));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 glass-panel border-r border-y-0 border-l-0 flex flex-col transition-transform duration-300">
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-white/5 space-y-3">
        <div className="bg-white rounded-lg px-3 py-1.5 inline-block">
          <img src={`${import.meta.env.BASE_URL}images/firstregistrars-logo.png`} alt="First Registrars" className="h-8 w-auto object-contain" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c4a747]">First Registrars</p>
          <p className="text-sm font-bold text-white leading-tight">BuildWise</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
        {sections.map(section => (
          <div key={section} className="space-y-2">
            <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section}</h4>
            <nav className="space-y-1">
              {NAV_ITEMS.filter(item => item.section === section).map((item) => {
                const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
                const Icon = item.icon;
                
                return (
                  <Link key={item.href} href={item.href} className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                    item.isAi && !isActive && "text-indigo-400 hover:text-indigo-300"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-primary" : "text-slate-500 group-hover:text-white",
                      item.isAi && "text-indigo-400"
                    )} />
                    {item.label}
                    {item.isAi && (
                      <span className="ml-auto flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

    </aside>
  );
}
