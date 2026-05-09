import React, { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { Check, Loader2, FileText, Search, BrainCircuit, PenTool, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import KeywordSelector from '../components/KeywordSelector';

const AGENTS = [
  { id: 'cv_parser', title: 'Parsing CV', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { id: 'jd_extractor', title: 'Extracting Job Requirements', icon: Search, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  { id: 'gap_analyser', title: 'Analysing ATS Gaps', icon: BrainCircuit, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { id: 'cv_rewriter', title: 'Rewriting CV', icon: PenTool, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  { id: 'cover_letter', title: 'Preparing Cover Letter', icon: Mail, color: 'text-amber-400', bg: 'bg-amber-500/20' },
];

export default function Step4_Processing() {
  const { 
    sessionId, pipelineStatus, setPipelineStatus, 
    agentStates, setAgentState, setCvData, setJdData, setGapData,
    selectedKeywords, nextStep 
  } = useAppStore();
  
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    
    const es = new EventSource(`/api/pipeline/stream/${sessionId}`);
    
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("SSE Event:", data);
      
      if (data.agent === 'pipeline') {
        setPipelineStatus(data.status);
        if (data.status === 'complete') {
          setTimeout(nextStep, 1500); // go to results after a short delay
        }
      } else if (data.agent) {
        setAgentState(data.agent, data.status);
        if (data.status === 'done' && data.data) {
          if (data.agent === 'cv_parser') setCvData(data.data);
          if (data.agent === 'jd_extractor') setJdData(data.data);
          if (data.agent === 'gap_analyser') setGapData(data.data);
        }
      }
    };

    es.onerror = (err) => {
      console.error("SSE Error:", err);
      es.close();
    };

    return () => es.close();
  }, [sessionId, setPipelineStatus, setAgentState, setCvData, setJdData, setGapData, nextStep]);

  const handleResume = async () => {
    setResuming(true);
    try {
      const res = await fetch(`/api/pipeline/resume/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_keywords: selectedKeywords }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setResuming(false);
    }
  };

  const isPaused = pipelineStatus === 'awaiting_keywords';

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="text-center mb-12">
        <h2 className="section-title mb-2">
          {isPaused ? 'Action Required' : 'Multi-Agent Pipeline'}
        </h2>
        <p className="section-sub">
          {isPaused 
            ? 'Review and select keywords before we rewrite your CV.' 
            : 'Our AI agents are analyzing and optimizing your application.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Pipeline visualization */}
        <div className="space-y-4">
          {AGENTS.map((agent, idx) => {
            const state = agentStates[agent.id];
            const isActive = state === 'running';
            const isDone = state === 'done';
            
            // special case: pause between agent 3 and 4
            const isPausePoint = idx === 3 && isPaused;

            return (
              <React.Fragment key={agent.id}>
                {isPausePoint && (
                  <div className="py-2 border-l-2 border-dashed border-brand-500/50 ml-6 pl-8 relative">
                    <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface-950 border-2 border-brand-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
                    </div>
                    <span className="text-xs font-medium text-brand-400">Waiting for user input...</span>
                  </div>
                )}
                
                <div 
                  className={`glass p-4 rounded-xl border flex items-center gap-4 transition-all duration-300
                    ${isActive ? 'border-white/30 bg-white/10 shadow-lg shadow-black/20 agent-running' : 
                      isDone ? 'border-white/5 opacity-70' : 'border-white/5 opacity-30 grayscale'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${agent.bg} ${agent.color}`}>
                    {isDone ? <Check size={20} /> : <agent.icon size={20} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-slate-200">{agent.title}</h4>
                    <p className="text-xs text-slate-500">
                      {isDone ? 'Completed' : isActive ? 'Processing...' : 'Waiting...'}
                    </p>
                  </div>
                  {isActive && <Loader2 size={18} className="animate-spin text-slate-400" />}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right: Interaction panel */}
        <div>
          {isPaused ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass p-6 rounded-2xl border border-brand-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)] h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto mb-6 pr-2">
                <KeywordSelector />
              </div>
              <div className="pt-4 border-t border-white/10">
                <button 
                  onClick={handleResume}
                  disabled={resuming}
                  className="btn-primary w-full"
                >
                  {resuming ? 'Resuming Pipeline...' : `Rewrite with ${selectedKeywords.length} Keywords`}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center glass rounded-2xl border border-white/5 opacity-50 p-8 text-center">
              <div>
                <BrainCircuit size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-sm text-slate-400">Pipeline is running autonomously.</p>
                <p className="text-xs text-slate-500 mt-1">Status details will appear here if needed.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
