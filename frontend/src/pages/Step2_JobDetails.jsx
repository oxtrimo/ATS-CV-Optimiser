import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { ArrowRight, ArrowLeft, Link as LinkIcon, Type, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Step2_JobDetails() {
  const { jdText, jdSource, jdUrl, setJdText, setJdSource, setJdUrl, nextStep, prevStep } = useAppStore();
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [scrapeWarning, setScrapeWarning] = useState('');

  const handleScrape = async () => {
    if (!jdUrl.trim()) return;
    
    setIsScraping(true);
    setScrapeError('');
    setScrapeWarning('');
    
    try {
      const res = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jdUrl }),
      });
      const data = await res.json();
      
      if (!data.success) {
        if (data.warning) setScrapeWarning(data.warning);
        else setScrapeError(data.error || 'Failed to extract text from URL');
      } else {
        setJdText(data.text);
        if (data.warning) setScrapeWarning(data.warning);
      }
    } catch (err) {
      setScrapeError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto py-8"
    >
      <div className="mb-8">
        <h2 className="section-title mb-2">Target Job Description</h2>
        <p className="section-sub">Provide the job description you want to optimize your CV for.</p>
      </div>

      <div className="flex gap-2 p-1 bg-surface-900 rounded-xl mb-6 border border-white/10 w-fit">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${jdSource === 'paste' ? 'bg-surface-800 text-white shadow shadow-black/50' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setJdSource('paste')}
        >
          <Type size={16} /> Paste Text
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${jdSource === 'url' ? 'bg-surface-800 text-white shadow shadow-black/50' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setJdSource('url')}
        >
          <LinkIcon size={16} /> From URL
        </button>
      </div>

      {jdSource === 'url' && (
        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <input
              type="url"
              value={jdUrl}
              onChange={(e) => setJdUrl(e.target.value)}
              placeholder="https://example.com/job-posting"
              className="input flex-1"
            />
            <button 
              onClick={handleScrape}
              disabled={!jdUrl || isScraping}
              className="btn-secondary whitespace-nowrap"
            >
              {isScraping ? <Loader2 size={18} className="animate-spin" /> : 'Extract Text'}
            </button>
          </div>
          
          {(scrapeError || scrapeWarning) && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm
              ${scrapeError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>{scrapeError || scrapeWarning}</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-8">
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the full job description here..."
          className="textarea h-64 font-sans text-sm"
          readOnly={jdSource === 'url' && isScraping}
        ></textarea>
        <p className="text-xs text-slate-500 mt-2 text-right">
          {jdText.length} characters
        </p>
      </div>

      <div className="flex justify-between mt-10">
        <button onClick={prevStep} className="btn-ghost">
          <ArrowLeft size={18} /> Back
        </button>
        <button 
          onClick={nextStep} 
          disabled={!jdText.trim() || jdText.length < 50}
          className="btn-primary"
        >
          Continue to Preferences <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}
