import { useListVendorProjects } from "@workspace/api-client-react";
import { Card, Badge, Button } from "@/components/ui/shared";
import { getStatusColor, formatCurrency } from "@/lib/utils";
import { GitMerge, Loader2, ArrowRight, FileText } from "lucide-react";
import { format } from "date-fns";

const PIPELINE_STAGES = [
  { id: 'submitted', label: 'Submitted', color: 'border-slate-500' },
  { id: 'under_review', label: 'Under Review', color: 'border-blue-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-amber-500' },
  { id: 'approved', label: 'Approved', color: 'border-emerald-500' },
  { id: 'handover_in_progress', label: 'Handover Active', color: 'border-purple-500' },
  { id: 'handover_complete', label: 'Complete', color: 'border-success' },
];

export default function VendorPipeline() {
  const { data: vendorProjects, isLoading } = useListVendorProjects();

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center">
            <GitMerge className="w-6 h-6 mr-3 text-indigo-400" />
            Vendor Onboarding Pipeline
          </h2>
          <p className="text-slate-400 text-sm mt-1">Track external projects from submission through final handover.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex gap-6 h-[calc(100vh-12rem)] min-w-max px-2">
            {PIPELINE_STAGES.map((stage) => {
              const stageProjects = vendorProjects?.filter(p => p.stage === stage.id) || [];
              
              return (
                <div key={stage.id} className="w-80 flex flex-col h-full bg-slate-900/40 rounded-2xl border border-white/5">
                  <div className={`p-4 border-b-2 ${stage.color} shrink-0 bg-black/20 rounded-t-2xl`}>
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-slate-200">{stage.label}</h3>
                      <Badge variant="secondary" className="bg-white/10">{stageProjects.length}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                    {stageProjects.map((project) => (
                      <Card key={project.id} className="p-4 bg-card/80 hover:bg-card border-white/5 hover:border-indigo-500/30 transition-all shadow-lg cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-[10px] uppercase text-indigo-400 border-indigo-500/30 bg-indigo-500/10">
                            VEN-{project.vendorId}
                          </Badge>
                          {project.estimatedValue && (
                            <span className="text-xs font-medium text-emerald-400">{formatCurrency(project.estimatedValue)}</span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mb-2 leading-snug group-hover:text-indigo-400 transition-colors">{project.title}</h4>
                        
                        <div className="flex items-center text-xs text-slate-500 mt-4 pt-3 border-t border-white/5">
                          <FileText className="w-3 h-3 mr-1" />
                          {format(new Date(project.submittedAt), 'MMM d, yyyy')}
                        </div>
                      </Card>
                    ))}
                    {stageProjects.length === 0 && (
                      <div className="h-full flex items-center justify-center text-slate-600 text-sm italic py-12">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
