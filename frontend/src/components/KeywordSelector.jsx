import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { 
  Check, HelpCircle, Sparkles, ChevronDown, ChevronUp, 
  Loader2, AlertCircle, CheckCircle2, RotateCcw, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function KeywordCard({ item, isCritical }) {
  const { 
    sessionId, selectedKeywords, toggleKeyword, 
    contextualKeywords, setContextualKeyword, removeContextualKeyword 
  } = useAppStore();

  const kw = item.keyword;
  const isSelected = selectedKeywords.includes(kw);
  const contextualData = contextualKeywords[kw];
  const hasContextual = !!contextualData;

  // Local UI state
  const [showExplain, setShowExplain] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);

  const [showAlign, setShowAlign] = useState(false);
  const [userText, setUserText] = useState(contextualData?.user_context || '');
  const [alignLoading, setAlignLoading] = useState(false);
  const [alignmentResult, setAlignmentResult] = useState(contextualData?.alignment_result || null);

  // Fetch explanation (Tier B)
  const handleToggleExplain = async (e) => {
    e.stopPropagation();
    if (!showExplain && !explanation) {
      setExplainLoading(true);
      setShowExplain(true);
      try {
        const res = await fetch('/api/keywords/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, keyword: kw }),
        });
        const data = await res.json();
        setExplanation(data);
      } catch (err) {
        console.error('Explain error:', err);
      } finally {
        setExplainLoading(false);
      }
    } else {
      setShowExplain(!showExplain);
    }
  };

  // Analyze experience (Tier C)
  const handleAnalyzeExperience = async (e) => {
    e.stopPropagation();
    if (!userText.trim()) return;
    setAlignLoading(true);
    try {
      const res = await fetch('/api/keywords/align', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          keyword: kw,
          user_experience: userText.trim(),
        }),
      });
      const data = await res.json();
      setAlignmentResult(data);
    } catch (err) {
      console.error('Align error:', err);
    } finally {
      setAlignLoading(false);
    }
  };

  // Confirm transferable experience
  const handleConfirmAlignment = (e) => {
    e.stopPropagation();
    if (!alignmentResult) return;
    setContextualKeyword(kw, {
      keyword: kw,
      user_context: userText.trim(),
      suggested_bullet: alignmentResult.suggested_bullet,
      alignment_type: alignmentResult.alignment_type,
      is_aligned: alignmentResult.is_aligned,
      alignment_result: alignmentResult,
    });
    setShowAlign(false);
  };

  const handleRemoveContext = (e) => {
    e.stopPropagation();
    removeContextualKeyword(kw);
    setAlignmentResult(null);
    setUserText('');
  };

  const borderClass = isCritical 
    ? (isSelected ? 'border-red-500/60 bg-red-500/10' : 'border-white/10 hover:border-white/20 bg-white/5')
    : (isSelected ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/10 hover:border-white/20 bg-white/5');

  const checkColor = isCritical ? 'bg-red-500 border-red-500' : 'bg-amber-500 border-amber-500';

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${borderClass}`}>
      {/* Card Header: Clickable to toggle selection */}
      <div 
        onClick={() => toggleKeyword(kw)}
        className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-0.5 w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors ${
            isSelected ? `${checkColor} text-white` : 'border-slate-500 text-transparent'
          }`}>
            <Check size={14} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-sm ${
                isSelected 
                  ? (isCritical ? 'text-red-200' : 'text-amber-200') 
                  : 'text-slate-200'
              }`}>
                {kw}
              </span>

              {hasContextual && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Experience Linked
                </span>
              )}

              {item.importance && !hasContextual && (
                <span className={`text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${
                  isCritical ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {item.importance}
                </span>
              )}
            </div>

            {item.reason && !hasContextual && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.reason}</p>
            )}

            {hasContextual && (
              <p className="text-xs text-emerald-400/90 mt-1 italic line-clamp-2">
                "{contextualData.suggested_bullet || contextualData.user_context}"
              </p>
            )}
          </div>
        </div>

        {/* Action pills: Tier B & Tier C buttons */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Explain in context of this job"
            onClick={handleToggleExplain}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
              showExplain ? 'bg-brand-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <HelpCircle size={14} />
            <span className="hidden sm:inline">Explain</span>
          </button>

          <button
            type="button"
            title="Connect your actual experience to this keyword"
            onClick={() => setShowAlign(!showAlign)}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
              showAlign 
                ? 'bg-purple-600 text-white' 
                : hasContextual 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sparkles size={14} className={hasContextual ? 'text-emerald-400' : 'text-purple-400'} />
            <span className="hidden sm:inline">{hasContextual ? 'Edit Note' : 'I have experience'}</span>
          </button>
        </div>
      </div>

      {/* Tier B: Contextual Explanation Panel */}
      <AnimatePresence>
        {showExplain && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-brand-500/20 bg-brand-950/40 p-3.5 space-y-2 text-xs"
          >
            {explainLoading ? (
              <div className="flex items-center gap-2 text-brand-300 py-1">
                <Loader2 size={14} className="animate-spin" />
                <span>Analyzing role requirements for "{kw}"...</span>
              </div>
            ) : explanation ? (
              <div className="space-y-2 text-slate-300">
                <div>
                  <span className="font-semibold text-brand-300 block mb-0.5">Role Context:</span>
                  <p className="leading-relaxed text-slate-200">{explanation.role_context}</p>
                </div>
                {explanation.equivalents && (
                  <div>
                    <span className="font-semibold text-brand-300 block mb-0.5">Equivalents & Related Tools:</span>
                    <p className="leading-relaxed text-slate-300">{explanation.equivalents}</p>
                  </div>
                )}
                {explanation.self_check_question && (
                  <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-2 text-brand-200">
                    <span className="font-semibold block mb-0.5">Self-Check:</span>
                    <p>{explanation.self_check_question}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400">Failed to load explanation.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier C: User Experience Alignment Workspace */}
      <AnimatePresence>
        {showAlign && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-purple-500/20 bg-purple-950/30 p-3.5 space-y-3 text-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-purple-200 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-400" />
                  Your experience related to "{kw}":
                </span>
                {hasContextual && (
                  <button 
                    onClick={handleRemoveContext}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-0.5"
                  >
                    <X size={12} /> Remove context
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Describe in 1-2 sentences how you've used or encountered this concept. AI will evaluate alignment and construct an authentic CV bullet point.
              </p>
              <textarea
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder={`e.g. "I didn't use ${kw} specifically, but at my previous job I built a similar system using..."`}
                className="w-full bg-surface-950/80 border border-purple-500/30 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-400 resize-none h-18"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAlign(false)}
                className="btn-ghost text-xs py-1 px-3"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAnalyzeExperience}
                disabled={alignLoading || !userText.trim()}
                className="btn-primary text-xs py-1 px-3 bg-purple-600 hover:bg-purple-500 border-none flex items-center gap-1.5"
              >
                {alignLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Analyzing Alignment...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Validate Alignment</span>
                  </>
                )}
              </button>
            </div>

            {/* Alignment Evaluation Result */}
            {alignmentResult && (
              <div className={`p-3 rounded-lg border space-y-2 mt-2 ${
                alignmentResult.is_aligned
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5 text-xs">
                    {alignmentResult.is_aligned ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>Aligned ({alignmentResult.alignment_type})</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} className="text-amber-400" />
                        <span>Stretch / Unrelated</span>
                      </>
                    )}
                  </span>
                  {alignmentResult.recommended_section && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                      Add to: {alignmentResult.recommended_section}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {alignmentResult.feedback}
                </p>

                {alignmentResult.suggested_bullet && (
                  <div className="bg-surface-950/60 p-2.5 rounded border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Proposed CV Bullet:
                    </span>
                    <p className="text-xs text-emerald-300 font-medium leading-relaxed">
                      • {alignmentResult.suggested_bullet}
                    </p>
                  </div>
                )}

                {alignmentResult.is_aligned && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={handleConfirmAlignment}
                      className="btn-primary text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-500 border-none flex items-center gap-1"
                    >
                      <Check size={13} />
                      <span>Approve & Include in Rewrite</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function KeywordSelector() {
  const { gapData } = useAppStore();
  
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
        <h4 className="text-sm font-semibold text-brand-200 mb-1">
          Missing ATS Keywords & Transferable Skills
        </h4>
        <p className="text-xs text-brand-300/80 leading-relaxed">
          Select keywords you have experience with. Use <strong>Explain</strong> to see how a term is used in this role, or <strong>I have experience</strong> to describe your background and let AI weave your authentic story into the CV.
        </p>
      </div>

      {missingCritical.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
            Critical Keywords 
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-[10px] font-bold">
              {missingCritical.length}
            </span>
          </h4>
          <div className="space-y-3">
            {missingCritical.map((item, idx) => (
              <KeywordCard key={item.keyword || idx} item={item} isCritical={true} />
            ))}
          </div>
        </div>
      )}

      {missingPreferred.length > 0 && (
        <div className="pt-2">
          <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
            Preferred Keywords 
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold">
              {missingPreferred.length}
            </span>
          </h4>
          <div className="space-y-3">
            {missingPreferred.map((item, idx) => (
              <KeywordCard key={item.keyword || idx} item={item} isCritical={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
