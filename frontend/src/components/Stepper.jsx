import React from 'react';
import useAppStore from '../store/useAppStore';
import { Check, CircleDot } from 'lucide-react';

const steps = [
  { id: 1, title: 'Upload CV' },
  { id: 2, title: 'Job Details' },
  { id: 3, title: 'Preferences' },
  { id: 4, title: 'Processing' },
  { id: 5, title: 'Results' }
];

export default function Stepper() {
  const currentStep = useAppStore((state) => state.currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto px-4 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/10 z-0"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-brand-500 z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isCompleted ? 'bg-brand-500 border-brand-500 text-white' : 
                    isCurrent ? 'bg-surface-900 border-brand-500 text-brand-400 glow-blue' : 
                    'bg-surface-900 border-white/20 text-slate-500'}`}
              >
                {isCompleted ? <Check size={20} /> : 
                 isCurrent ? <CircleDot size={20} /> : 
                 <span className="text-sm font-medium">{step.id}</span>}
              </div>
              <span className={`text-xs font-medium absolute -bottom-6 whitespace-nowrap
                ${isCurrent ? 'text-brand-400' : isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
