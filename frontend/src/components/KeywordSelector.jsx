import React from 'react';
import useAppStore from '../store/useAppStore';
import { Check } from 'lucide-react';

export default function KeywordSelector() {
  const { gapData, selectedKeywords, toggleKeyword } = useAppStore();
  
  const missingCritical = gapData?.missing_critical_keywords || [];
  const missingPreferred = gapData?.missing_preferred_keywords || [];
  
  if (missingCritical.length === 0 && missingPreferred.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Great news! Your CV already contains all the important keywords.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
        <p className="text-sm text-brand-200">
          We found some keywords from the job description that are missing in your CV. 
          Select the ones you actually have experience with, and we'll weave them in naturally.
        </p>
      </div>

      {missingCritical.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
            Critical Keywords <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-[10px]">{missingCritical.length}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {missingCritical.map((kw, idx) => {
              const isSelected = selectedKeywords.includes(kw.keyword);
              return (
                <div 
                  key={idx}
                  onClick={() => toggleKeyword(kw.keyword)}
                  className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${isSelected ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                >
                  <div className={`mt-0.5 w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors
                    ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-slate-500 text-transparent'}`}>
                    <Check size={14} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${isSelected ? 'text-red-200' : 'text-slate-200'}`}>{kw.keyword}</p>
                    {kw.suggestion && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{kw.suggestion}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {missingPreferred.length > 0 && (
        <div className="pt-2">
          <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
            Preferred Keywords <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px]">{missingPreferred.length}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {missingPreferred.map((kw, idx) => {
              const isSelected = selectedKeywords.includes(kw.keyword);
              return (
                <div 
                  key={idx}
                  onClick={() => toggleKeyword(kw.keyword)}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${isSelected ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                >
                  <div className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors
                    ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-500 text-transparent'}`}>
                    <Check size={14} />
                  </div>
                  <p className={`font-medium text-sm ${isSelected ? 'text-amber-200' : 'text-slate-200'}`}>{kw.keyword}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
