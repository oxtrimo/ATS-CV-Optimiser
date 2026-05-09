import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // ── Step navigation ──────────────────────────────
  currentStep: 1,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 5) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

  // ── CV data ──────────────────────────────────────
  cvFile:    null,
  cvText:    '',
  cvFormat:  '',      // 'pdf' | 'tex' | 'txt' | 'md'
  isLatex:   false,
  setCvFile:   (file)    => set({ cvFile: file }),
  setCvText:   (text)    => set({ cvText: text }),
  setCvFormat: (fmt)     => set({ cvFormat: fmt }),
  setIsLatex:  (flag)    => set({ isLatex: flag }),

  // ── Job description ──────────────────────────────
  jdText:   '',
  jdSource: 'paste',  // 'paste' | 'url'
  jdUrl:    '',
  setJdText:   (t) => set({ jdText: t }),
  setJdSource: (s) => set({ jdSource: s }),
  setJdUrl:    (u) => set({ jdUrl: u }),

  // ── Preferences ──────────────────────────────────
  preferences: {
    coverLetterStyle: 'professional',  // professional | conversational | technical
    tone:             'balanced',      // formal | balanced | achievement
    outputFormat:     'both',          // tex | pdf | both
  },
  setPreferences: (prefs) =>
    set((s) => ({ preferences: { ...s.preferences, ...prefs } })),

  // ── Pipeline session ─────────────────────────────
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  pipelineStatus: 'idle', // idle | running | awaiting_keywords | complete | error
  setPipelineStatus: (st) => set({ pipelineStatus: st }),

  agentStates: {
    cv_parser:    'idle', // idle | running | done | error
    jd_extractor: 'idle',
    gap_analyser:  'idle',
    cv_rewriter:   'idle',
    cover_letter:  'idle',
  },
  setAgentState: (agent, state) =>
    set((s) => ({ agentStates: { ...s.agentStates, [agent]: state } })),

  // ── Analysis results ──────────────────────────────
  cvData:   {},
  jdData:   {},
  gapData:  {},
  setCvData:  (d) => set({ cvData: d }),
  setJdData:  (d) => set({ jdData: d }),
  setGapData: (d) => set({ gapData: d }),

  // ── Keyword selection ─────────────────────────────
  selectedKeywords: [],
  setSelectedKeywords: (kws) => set({ selectedKeywords: kws }),
  toggleKeyword: (kw) =>
    set((s) => ({
      selectedKeywords: s.selectedKeywords.includes(kw)
        ? s.selectedKeywords.filter((k) => k !== kw)
        : [...s.selectedKeywords, kw],
    })),

  // ── Rewrite & cover letter results ────────────────
  rewriteResult:     {},
  coverLetterResult: {},
  editedLatex:       '',
  setRewriteResult:     (r) => set({ rewriteResult: r, editedLatex: r.rewritten_cv || '' }),
  setCoverLetterResult: (r) => set({ coverLetterResult: r }),
  setEditedLatex:       (t) => set({ editedLatex: t }),

  // ── Chat ──────────────────────────────────────────
  chatHistory:  [],
  chatOpen:     false,
  setChatOpen:  (v) => set({ chatOpen: v }),
  addChatMessage: (msg) =>
    set((s) => ({ chatHistory: [...s.chatHistory, msg] })),

  // ── Full reset ────────────────────────────────────
  reset: () =>
    set({
      currentStep: 1, cvFile: null, cvText: '', cvFormat: '', isLatex: false,
      jdText: '', jdSource: 'paste', jdUrl: '', sessionId: null,
      pipelineStatus: 'idle',
      agentStates: { cv_parser: 'idle', jd_extractor: 'idle', gap_analyser: 'idle',
                     cv_rewriter: 'idle', cover_letter: 'idle' },
      cvData: {}, jdData: {}, gapData: {}, rewriteResult: {},
      coverLetterResult: {}, editedLatex: '', selectedKeywords: [],
    }),
}))

export default useAppStore
