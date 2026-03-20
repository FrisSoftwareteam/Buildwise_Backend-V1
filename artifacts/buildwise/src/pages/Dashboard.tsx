import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui/shared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FolderKanban, ListTodo, Briefcase, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#64748b', '#ef4444'];

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (isError || !stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
        <p>Failed to load dashboard statistics.</p>
        <p className="text-sm">Ensure the API is running and seeded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome & AI Highlight */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 to-indigo-500/10 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none"></div>
        <div className="z-10">
          <h2 className="text-2xl font-bold font-display text-white">Welcome back, Team!</h2>
          <p className="text-slate-400 mt-1">Here's what's happening across First Registrars projects today.</p>
        </div>
        <Link href="/ai-advisor" className="z-10">
          <Button className="bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25 border border-indigo-400/30">
            <TrendingUp className="w-4 h-4 mr-2" />
            View AI Insights
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-card to-card border-white/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Active Projects</p>
              <h3 className="text-3xl font-bold text-white mt-1">{stats.activeProjects}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-card border-white/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Total Tasks</p>
              <h3 className="text-3xl font-bold text-white mt-1">{stats.totalTasks}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card border-white/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Active Vendors</p>
              <h3 className="text-3xl font-bold text-white mt-1">{stats.activeVendors}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card border-white/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Avg Completion</p>
              <h3 className="text-3xl font-bold text-white mt-1">{Math.round(stats.avgCompletionRate)}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Projects by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.projectsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {stats.projectsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tasksByStatus} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="status" stroke="#64748b" tick={{fill: '#64748b'}} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
