import React from 'react';
import { AnimatePresence } from 'framer-motion';
import useAppStore from './store/useAppStore';
import Stepper from './components/Stepper';
import ChatWidget from './components/ChatWidget';

// Steps
import Step1_Upload from './pages/Step1_Upload';
import Step2_JobDetails from './pages/Step2_JobDetails';
import Step3_Preferences from './pages/Step3_Preferences';
import Step4_Processing from './pages/Step4_Processing';
import Step5_Results from './pages/Step5_Results';

function App() {
  const currentStep = useAppStore((state) => state.currentStep);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-brand-900/20 to-transparent -z-10 pointer-events-none"></div>

      {/* Header */}
      <header className="w-full bg-surface-950/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/20">
              ATS
            </div>
            <span className="font-bold text-lg tracking-tight text-white">CV Optimizer</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-300">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6">
        <Stepper />
        
        <div className="flex-1 w-full relative">
          <AnimatePresence mode="wait">
            {currentStep === 1 && <Step1_Upload key="step1" />}
            {currentStep === 2 && <Step2_JobDetails key="step2" />}
            {currentStep === 3 && <Step3_Preferences key="step3" />}
            {currentStep === 4 && <Step4_Processing key="step4" />}
            {currentStep === 5 && <Step5_Results key="step5" />}
          </AnimatePresence>
        </div>
      </main>

      {/* Persistent Chat Widget */}
      <ChatWidget />
    </div>
  );
}

export default App;
