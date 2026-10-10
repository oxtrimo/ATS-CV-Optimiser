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
    setRewriteResult, setCoverLetterResult,
    selectedKeywords, contextualKeywords, preferences, nextStep 
  } = useAppStore();
  
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    
    let isMounted = true;
    let es = null;
    let pollInterval = null;

    const connectSSE = () => {
      try {
        if (es) es.close();
      } catch (e) {}

      es = new EventSource(`/api/pipeline/stream/${sessionId}`);
      
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("SSE Event:", data);
          
          if (data.agent === 'pipeline') {
            setPipelineStatus(data.status);
            if (data.status === 'complete') {
              if (es) es.close();
              setTimeout(nextStep, 1200);
            }
          } else if (data.agent) {
            setAgentState(data.agent, data.status);
            if (data.status === 'done' && data.data) {
              if (data.agent === 'cv_parser') setCvData(data.data);
              if (data.agent === 'jd_extractor') setJdData(data.data);
              if (data.agent === 'gap_analyser') setGapData(data.data);
              if (data.agent === 'cv_rewriter') setRewriteResult(data.data);
              if (data.agent === 'cover_letter') setCoverLetterResult(data.data);
            }
          }
        } catch (e) {
          // Heartbeat or non-json event
        }
      };

      es.onerror = (err) => {
        console.warn("SSE connection interrupted:", err);
      };
    };

    connectSSE();

    // Fallback polling every 2.5s in case SSE is blocked by proxies/Cloud Run
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline/results/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.status === 'complete') {
          setPipelineStatus('complete');
          setAgentState('cv_rewriter', 'done');
          if (data.cover_letter && data.cover_letter.cover_letter) {
            setAgentState('cover_letter', 'done');
            setCoverLetterResult(data.cover_letter);
          } else {
            setAgentState('cover_letter', 'skipped');
          }
          if (data.rewrite_result) setRewriteResult(data.rewrite_result);
          clearInterval(pollInterval);
          if (es) es.close();
          setTimeout(nextStep, 1000);
        } else if (data.status === 'running') {
          // If backend is executing Phase 2
          if (data.gap_data && Object.keys(data.gap_data).length > 0) {
            setPipelineStatus('running');
            if (!data.rewrite_result || Object.keys(data.rewrite_result).length === 0) {
              setAgentState('cv_rewriter', 'running');
            } else {
              setAgentState('cv_rewriter', 'done');
              if (preferences.generateCoverLetter !== false) {
                setAgentState('cover_letter', 'running');
              }
            }
          }
        } else if (data.status === 'awaiting_keywords') {
          setPipelineStatus('awaiting_keywords');
          if (data.gap_data && Object.keys(data.gap_data).length > 0) {
            setGapData(data.gap_data);
          }
        }
      } catch (err) {
        console.error("Pipeline poll error:", err);
      }
    }, 2500);

    return () => {
      isMounted = false;
      if (es) es.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, preferences.generateCoverLetter, setPipelineStatus, setAgentState, setCvData, setJdData, setGapData, setRewriteResult, setCoverLetterResult, nextStep]);

  const handleResume = async () => {
    setResuming(true);
    setPipelineStatus('running');
    setAgentState('cv_rewriter', 'running');

    try {
      const contextualList = Object.values(contextualKeywords || {});
      const res = await fetch(`/api/pipeline/resume/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          selected_keywords: selectedKeywords,
          contextual_keywords: contextualList
        }),
      });
      const data = await res.json();
      if (data.error && data.status !== 'running') {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Resume error:", err);
      if (!err.message?.includes("is not paused")) {
        alert(`Error: ${err.message}`);
      }
    } finally {
      setResuming(false);
    }
  };

  const isPaused = pipelineStatus === 'awaiting_keywords';
  const isPhase2Running = pipelineStatus === 'running' && (agentStates.cv_rewriter === 'running' || agentStates.cover_letter === 'running');

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="text-center mb-12">
        <h2 className="section-title mb-2">
          {isPaused ? 'Action Required' : 'Multi-Agent Pipeline'}
        </h2>
        <p className="section-sub">
          {isPaused 
            ? 'Review and select keywords before we rewrite your CV.' 
            : isPhase2Running
              ? 'Rewriting your CV with selected keywords and tailoring your cover letter...'
              : 'Our AI agents are analyzing and optimizing your application.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Pipeline visualization */}
        <div className="space-y-4">
          {AGENTS.map((agent, idx) => {
            const state = agentStates[agent.id];
            const isActive = state === 'running';
            const isSkipped = state === 'skipped' || (agent.id === 'cover_letter' && preferences.generateCoverLetter === false && (state === 'done' || pipelineStatus === 'complete'));
            const isDone = state === 'done' && !isSkipped;
            
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
                      isSkipped ? 'border-white/5 opacity-40 grayscale' :
                      isDone ? 'border-white/5 opacity-70' : 'border-white/5 opacity-30 grayscale'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${agent.bg} ${agent.color}`}>
                    {isSkipped ? <span className="text-xs font-bold text-slate-400">—</span> : isDone ? <Check size={20} /> : <agent.icon size={20} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-slate-200">{agent.title}</h4>
                    <p className="text-xs text-slate-500">
                      {isSkipped ? 'Skipped (Not requested)' : isDone ? 'Completed' : isActive ? 'Processing...' : 'Waiting...'}
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
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {resuming ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Starting Rewrite...</span>
                    </>
                  ) : (
                    <span>
                      Rewrite with {selectedKeywords.length} Keyword{selectedKeywords.length !== 1 ? 's' : ''}
                      {Object.keys(contextualKeywords || {}).length > 0 && ` (${Object.keys(contextualKeywords).length} contextual)`}
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          ) : isPhase2Running ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass p-8 rounded-2xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] h-full flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 relative">
                <PenTool className="text-emerald-400 animate-pulse" size={28} />
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 border-t-transparent animate-spin"></div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Rewriting CV for ATS</h3>
              <p className="text-sm text-slate-400 max-w-xs mb-4">
                Integrating {selectedKeywords.length} selected keywords naturally and structuring your profile for maximum recruiter match.
              </p>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <Loader2 size={13} className="animate-spin" />
                <span>Generating optimized sections...</span>
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
