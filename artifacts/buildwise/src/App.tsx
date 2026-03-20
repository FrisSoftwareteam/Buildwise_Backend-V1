import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";

// Pages
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Vendors from "@/pages/Vendors";
import VendorPipeline from "@/pages/VendorPipeline";
import BoardView from "@/pages/BoardView";
import AIAdvisor from "@/pages/AIAdvisor";

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

function Router() {
  return (
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
  );
}

function App() {
  // Hardcode dark mode class on html/body for full coverage
  document.documentElement.classList.add('dark');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
