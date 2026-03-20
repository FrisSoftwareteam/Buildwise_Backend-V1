import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";
import { AuthProvider, useAuth } from "@/context/AuthContext";

// Pages
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Vendors from "@/pages/Vendors";
import VendorPipeline from "@/pages/VendorPipeline";
import BoardView from "@/pages/BoardView";
import AIAdvisor from "@/pages/AIAdvisor";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-500">
      <h2 className="text-2xl font-display text-white mb-2">{title}</h2>
      <p>This section is currently under development.</p>
    </div>
  );
}

function ProtectedRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white rounded-xl px-5 py-3">
            <img
              src={`${import.meta.env.BASE_URL}images/firstregistrars-logo.png`}
              alt="First Registrars"
              className="h-9 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading BuildWise...
          </div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Auth routes — always accessible */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Protected routes */}
      <Route>
        {!user ? (
          <Redirect to="/login" />
        ) : (
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/projects" component={Projects} />
              <Route path="/projects/:id" component={ProjectDetail} />
              <Route path="/board" component={BoardView} />
              <Route path="/backlog" component={() => <PlaceholderPage title="Backlog" />} />
              <Route path="/sprints" component={() => <PlaceholderPage title="Sprint Management" />} />
              <Route path="/vendors" component={Vendors} />
              <Route path="/vendor-pipeline" component={VendorPipeline} />
              <Route path="/team" component={() => <PlaceholderPage title="Team Directory" />} />
              <Route path="/ai-advisor" component={AIAdvisor} />
              <Route path="/settings" component={() => <PlaceholderPage title="Platform Settings" />} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  document.documentElement.classList.add("dark");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ProtectedRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
