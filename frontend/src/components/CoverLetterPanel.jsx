import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { Copy, Check, FileText } from 'lucide-react';

export default function CoverLetterPanel() {
  const { coverLetterResult } = useAppStore();
  const [copied, setCopied] = useState(false);

  const text = coverLetterResult?.cover_letter || '';
  const subject = coverLetterResult?.subject_line || '';

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!text) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center glass rounded-xl border border-white/10">
        <FileText size={48} className="mb-4 opacity-20" />
        <p>No cover letter generated.</p>
        <p className="text-sm mt-2">You can request one from the options.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col glass rounded-xl border border-white/10 overflow-hidden relative group">
      <div className="bg-surface-900 border-b border-white/10 p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-1">Suggested Subject Line</h3>
            <p className="text-slate-100 font-medium">{subject}</p>
          </div>
          <button 
            onClick={handleCopy}
            className="btn-secondary text-xs px-3 py-1.5 h-auto rounded-lg flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans bg-surface-950/50">
        {text}
      </div>
    </div>
  );
}
