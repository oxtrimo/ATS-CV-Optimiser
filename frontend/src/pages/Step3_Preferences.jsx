import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { ArrowRight, ArrowLeft, Settings2, SlidersHorizontal, CheckCircle2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Step3_Preferences() {
  const { preferences, setPreferences, nextStep, prevStep } = useAppStore();
  const { setPipelineStatus, setSessionId, cvText, jdText, isLatex } = useAppStore();
  const [isStarting, setIsStarting] = useState(false);

  const tones = [
    { id: 'balanced', title: 'Balanced', desc: 'Professional yet approachable.' },
    { id: 'formal', title: 'Formal', desc: 'Strictly professional for corporate roles.' },
    { id: 'achievement', title: 'Achievement-focused', desc: 'Emphasises quantifiable metrics and impact.' }
  ];

  const coverLetterStyles = [
    { id: 'professional', title: 'Professional', desc: 'Standard formal business letter.' },
    { id: 'conversational', title: 'Conversational', desc: 'Warm and personal narrative.' },
    { id: 'technical', title: 'Technical', desc: 'Focuses heavily on technical skills and tools.' }
  ];

  const handleStartPipeline = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/pipeline/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_text: cvText,
          is_latex: isLatex,
          jd_text: jdText,
          preferences
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setSessionId(data.session_id);
      setPipelineStatus('running');
      nextStep();
    } catch (err) {
      alert(`Error starting pipeline: ${err.message}`);
    } finally {
      setIsStarting(false);
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
        <h2 className="section-title mb-2">Optimization Preferences</h2>
        <p className="section-sub">Configure how the AI should rewrite your CV and cover letter.</p>
      </div>

      <div className="space-y-8">
        {/* CV Tone */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Settings2 size={16} /> CV Rewrite Tone
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tones.map((t) => (
              <div 
                key={t.id}
                onClick={() => setPreferences({ tone: t.id })}
                className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden
                  ${preferences.tone === t.id 
                    ? 'bg-brand-600/10 border-brand-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'}`}
              >
                {preferences.tone === t.id && (
                  <div className="absolute top-3 right-3 text-brand-400">
                    <CheckCircle2 size={16} />
                  </div>
                )}
                <h4 className={`font-medium mb-1 text-sm ${preferences.tone === t.id ? 'text-brand-300' : 'text-slate-200'}`}>
                  {t.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cover Letter Options */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/20 text-accent-400 flex items-center justify-center">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Generate Tailored Cover Letter</h3>
                <p className="text-xs text-slate-400">Create a personalized 3-paragraph cover letter matched to this job description</p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => setPreferences({ generateCoverLetter: !preferences.generateCoverLetter })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                preferences.generateCoverLetter ? 'bg-accent-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  preferences.generateCoverLetter ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {preferences.generateCoverLetter ? (
            <div className="pt-3 border-t border-white/5">
              <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                <SlidersHorizontal size={14} /> Choose Tone / Style
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {coverLetterStyles.map((t) => (
                  <div 
                    key={t.id}
                    onClick={() => setPreferences({ coverLetterStyle: t.id })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all relative overflow-hidden
                      ${preferences.coverLetterStyle === t.id 
                        ? 'bg-accent-600/15 border-accent-500 shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'}`}
                  >
                    {preferences.coverLetterStyle === t.id && (
                      <div className="absolute top-2.5 right-2.5 text-accent-400">
                        <CheckCircle2 size={15} />
                      </div>
                    )}
                    <h4 className={`font-medium mb-1 text-xs ${preferences.coverLetterStyle === t.id ? 'text-accent-300' : 'text-slate-200'}`}>
                      {t.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-white/5">
              <p className="text-xs text-slate-500 italic">
                Cover letter step will be skipped during pipeline rewrite. You can still generate one on-demand in the Results view.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-12 pt-6 border-t border-white/10">
        <button onClick={prevStep} className="btn-ghost">
          <ArrowLeft size={18} /> Back
        </button>
        <button 
          onClick={handleStartPipeline} 
          disabled={isStarting}
          className="btn-primary px-8"
        >
          {isStarting ? 'Starting...' : 'Start AI Analysis'} <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}
