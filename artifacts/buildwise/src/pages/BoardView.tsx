import { useListTasks, useListProjects } from "@workspace/api-client-react";
import { Card, Badge, Button } from "@/components/ui/shared";
import { Loader2, Trello, MoreHorizontal } from "lucide-react";
import { useState } from "react";

const BOARD_COUMNS = [
  { id: 'backlog', label: 'Backlog', color: 'border-slate-500' },
  { id: 'todo', label: 'To Do', color: 'border-blue-500' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-500' },
  { id: 'in_review', label: 'In Review', color: 'border-purple-500' },
  { id: 'done', label: 'Done', color: 'border-emerald-500' },
];

export default function BoardView() {
  const { data: projects } = useListProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  // Default to first project if none selected
  const activeProjectId = selectedProjectId || projects?.[0]?.id;
  const { data: tasks, isLoading } = useListTasks(activeProjectId || 0, { query: { enabled: !!activeProjectId } });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center">
            <Trello className="w-6 h-6 mr-3 text-primary" />
            Global Board
          </h2>
        </div>
        <div>
          <select 
            className="h-10 rounded-lg border border-white/10 bg-black/40 px-4 text-white focus:ring-2 focus:ring-primary focus:outline-none min-w-[200px]"
            value={activeProjectId || ''}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
          >
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex gap-4 h-[calc(100vh-12rem)] min-w-max px-2">
            {BOARD_COUMNS.map((col) => {
              const colTasks = tasks?.filter(t => t.status === col.id) || [];
              
              return (
                <div key={col.id} className="w-80 flex flex-col h-full bg-slate-900/40 rounded-xl border border-white/5">
                  <div className={`p-3 border-t-2 ${col.color} shrink-0`}>
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-slate-200 text-sm uppercase tracking-wider">{col.label}</h3>
                      <Badge variant="secondary" className="bg-white/5 text-slate-400">{colTasks.length}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                    {colTasks.map((task) => (
                      <Card key={task.id} className="p-3 bg-card hover:bg-slate-800 border-white/5 hover:border-primary/30 transition-all shadow-md group">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-[10px] uppercase text-slate-400 border-slate-700 bg-slate-800">
                            {task.type}
                          </Badge>
                          <button className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="text-sm font-medium text-white mb-3">{task.title}</h4>
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex -space-x-2">
                             <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-[10px] font-bold text-primary">JD</div>
                          </div>
                          {task.storyPoints && (
                            <span className="text-xs font-mono bg-slate-800 text-slate-400 px-1.5 rounded">{task.storyPoints}</span>
                          )}
                        </div>
                      </Card>
                    ))}
                    
                    <Button variant="ghost" className="w-full text-slate-500 hover:text-white hover:bg-white/5 border border-dashed border-white/10 justify-start">
                      + Add Task
                    </Button>
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
