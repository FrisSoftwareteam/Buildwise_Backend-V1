import { useState } from "react";
import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { Card, Button, Badge, Input, Dialog, Label, Select } from "@/components/ui/shared";
import { getStatusColor, formatCurrency } from "@/lib/utils";
import { Plus, Search, Building2, Globe2, Loader2, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: projects, isLoading } = useListProjects();
  
  const createMutation = useCreateProject({
    mutation: {
      onSuccess: () => {
        setIsCreateOpen(false);
        // Standard invalidate queries would go here
        window.location.reload(); // Simple fallback since we don't have direct queryClient access here
      }
    }
  });

  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">All Projects</h2>
          <p className="text-slate-400 text-sm">Manage internal and vendor projects across all regions.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search projects..." 
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects?.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block group">
              <Card className="h-full hover:border-primary/50 hover:shadow-primary/10 transition-all duration-300">
                <div className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="custom" className={getStatusColor(project.status)}>
                      {project.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {project.type === 'vendor' ? (
                        <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10">Vendor</Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Internal</Badge>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-6 flex-1">
                    {project.description || "No description provided."}
                  </p>

                  <div className="space-y-4 mt-auto pt-4 border-t border-white/5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1.5"><Globe2 className="w-4 h-4"/> {project.country || 'Global'}</span>
                      <span className="text-slate-300 font-medium">{formatCurrency(project.budget)}</span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Completion</span>
                        <span className="text-white font-medium">{project.completionRate}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${project.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          
          {filteredProjects?.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No projects found matching your criteria.</p>
            </div>
          )}
        </div>
      )}

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Project">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          createMutation.mutate({
            data: {
              name: fd.get('name') as string,
              description: fd.get('description') as string,
              type: fd.get('type') as any,
              status: fd.get('status') as any,
              priority: fd.get('priority') as any,
              country: fd.get('country') as string,
            }
          });
        }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Project Name</label>
            <Input name="name" required placeholder="e.g. Q3 Server Migration" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Description</label>
            <Input name="description" placeholder="Brief overview..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Type</label>
              <select name="type" className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="internal">Internal</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
              <select name="status" className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Priority</label>
              <select name="priority" className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Country</label>
              <Input name="country" placeholder="e.g. Nigeria" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create Project</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
