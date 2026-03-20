import { useState } from "react";
import { useListProjects, useAnalyzeProject } from "@workspace/api-client-react";
import { Card, CardContent, Button, Badge } from "@/components/ui/shared";
import { BrainCircuit, Loader2, CheckCircle2, AlertTriangle, Target, Lightbulb, TrendingUp } from "lucide-react";

export default function AIAdvisor() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const { data: projects } = useListProjects();
  
  const analyzeMutation = useAnalyzeProject();

  const handleAnalyze = () => {
    if (!selectedProjectId) return;
    analyzeMutation.mutate({
      data: {
        projectId: Number(selectedProjectId),
        includeFinancial: true
      }
    });
  };

  const result = analyzeMutation.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center">
            <BrainCircuit className="w-6 h-6 mr-3 text-indigo-400" />
            AI Business Advisor
          </h2>
          <p className="text-slate-400 text-sm mt-1">Get strategic recommendations, profitability forecasts, and risk analysis powered by AI.</p>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950/20 border-indigo-500/20">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-indigo-200 mb-2 block">Select Project to Analyze</label>
            <select 
              className="w-full h-12 rounded-lg border border-indigo-500/30 bg-black/40 px-4 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            >
              <option value="">-- Choose a project --</option>
              {projects?.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.country || 'Global'})</option>
              ))}
            </select>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={!selectedProjectId || analyzeMutation.isPending}
            className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25 w-full md:w-auto"
          >
            {analyzeMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><BrainCircuit className="w-4 h-4 mr-2" /> Generate Analysis</>
            )}
          </Button>
        </div>
      </Card>

      {analyzeMutation.isPending && (
        <div className="py-24 flex flex-col items-center justify-center text-indigo-400 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
            <BrainCircuit className="w-16 h-16 animate-pulse relative z-10" />
          </div>
          <p className="font-medium animate-pulse">Processing millions of data points...</p>
        </div>
      )}

      {result && !analyzeMutation.isPending && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Main Summary Col */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden border-indigo-500/20 ai-border-glow">
              <div className="p-6 bg-slate-900/80">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold ai-gradient-text">Executive Summary</h3>
                  {result.recommendation && (
                    <Badge className={
                      result.recommendation === 'continue' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      result.recommendation === 'pause' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      result.recommendation === 'stop' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                    }>
                      Recommendation: {result.recommendation.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <p className="text-slate-300 leading-relaxed text-lg">{result.summary}</p>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h4 className="text-emerald-400 font-semibold mb-4 flex items-center"><Target className="w-4 h-4 mr-2"/> Strategic Insights</h4>
                <ul className="space-y-3">
                  {result.insights.map((insight, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500/50 shrink-0 mt-0.5" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6">
                <h4 className="text-red-400 font-semibold mb-4 flex items-center"><AlertTriangle className="w-4 h-4 mr-2"/> Identified Risks</h4>
                <ul className="space-y-3">
                  {result.risks.map((risk, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-300">
                      <AlertTriangle className="w-4 h-4 mr-2 text-red-500/50 shrink-0 mt-0.5" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          {/* Right Sidebar Col */}
          <div className="space-y-6">
            {result.profitabilityScore !== null && (
              <Card className="p-6 text-center bg-gradient-to-b from-card to-emerald-950/20 border-emerald-500/10">
                <h4 className="text-slate-400 font-medium mb-4">Predicted Profitability</h4>
                <div className="relative inline-flex items-center justify-center w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray={2 * Math.PI * 60} 
                      strokeDashoffset={2 * Math.PI * 60 * (1 - result.profitabilityScore / 100)}
                      className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000" 
                    />
                  </svg>
                  <span className="absolute text-3xl font-bold text-white">{result.profitabilityScore}<span className="text-base text-emerald-500">%</span></span>
                </div>
              </Card>
            )}

            <Card className="p-6 border-amber-500/20 bg-amber-950/10">
              <h4 className="text-amber-400 font-semibold mb-3 flex items-center"><Lightbulb className="w-4 h-4 mr-2"/> Improvement Suggestions</h4>
              <ul className="space-y-3">
                {result.suggestions.map((sug, i) => (
                  <li key={i} className="text-sm text-slate-300 pb-3 border-b border-amber-500/10 last:border-0 last:pb-0">{sug}</li>
                ))}
              </ul>
            </Card>

            {result.versionAdvice && (
              <Card className="p-6 border-blue-500/20 bg-blue-950/10">
                <h4 className="text-blue-400 font-semibold mb-3 flex items-center"><TrendingUp className="w-4 h-4 mr-2"/> V2 Recommendation</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{result.versionAdvice}</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
