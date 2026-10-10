import React, { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import MatchScoreGauge from '../components/MatchScoreGauge';
import LaTeXEditor from '../components/LaTeXEditor';
import CoverLetterPanel from '../components/CoverLetterPanel';
import { FileText, Download, RotateCcw, AlertTriangle, Check } from 'lucide-react';

export default function Step5_Results() {
  const { sessionId, gapData, rewriteResult, reset } = useAppStore();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cv'); // 'cv' | 'cover_letter'

  useEffect(() => {
    // Fetch complete results from backend in case store missed anything
    if (!sessionId) return;
    
    fetch(`/api/pipeline/results/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        setResults(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading final results...</div>;
  }

  const oldScore = gapData?.overall_score || 0;
  const newScore = rewriteResult?.new_score_estimate || results?.rewrite_result?.new_score_estimate || oldScore;
  const addedKeywords = rewriteResult?.keywords_incorporated || results?.rewrite_result?.keywords_incorporated || [];

  return (
    <div className="max-w-6xl mx-auto py-6 h-[calc(100vh-140px)] flex flex-col">
      {/* Top section: Scores & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 shrink-0">
        <div className="glass p-6 rounded-2xl border border-white/10 flex items-center justify-around col-span-1 lg:col-span-2">
          <MatchScoreGauge score={oldScore} title="Original Score" />
          <div className="text-slate-500 font-bold text-2xl">→</div>
          <MatchScoreGauge score={newScore} title="New Optimized Score" />
        </div>
        
        <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col justify-center">
          <h3 className="font-medium text-slate-200 mb-2 flex items-center gap-2">
            <Check className="text-emerald-400" size={18} /> Improvements Made
          </h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>• Added {addedKeywords.length} ATS-friendly keywords</li>
            <li>• Optimized section structuring</li>
            <li>• Tailored phrasing to JD requirements</li>
          </ul>
          
          <button 
            onClick={reset}
            className="mt-6 btn-ghost text-xs self-start"
          >
            <RotateCcw size={14} /> Start Over
          </button>
        </div>
      </div>

      {/* Main interactive area: Tabs for CV and Cover Letter */}
      <div className="flex-1 flex flex-col min-h-0 bg-surface-900/50 rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex border-b border-white/10">
          <button 
            onClick={() => setActiveTab('cv')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'cv' ? 'border-brand-500 text-brand-300 bg-brand-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
          >
            Optimized CV Editor
          </button>
          <button 
            onClick={() => setActiveTab('cover_letter')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'cover_letter' ? 'border-accent-500 text-accent-300 bg-accent-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
          >
            Cover Letter
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-hidden relative">
          {activeTab === 'cv' ? (
            <LaTeXEditor />
          ) : (
            <CoverLetterPanel />
          )}
        </div>
      </div>
    </div>
  );
}
