import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import DropZone from '../components/DropZone';
import { ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';

export default function Step1_Upload() {
  const { cvFile, nextStep } = useAppStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto py-8"
    >
      <div className="text-center mb-10">
        <h1 className="section-title text-4xl mb-3">Welcome to ATS CV Optimizer</h1>
        <p className="section-sub text-base">Upload your current CV to begin the AI-powered optimization process.</p>
      </div>

      <div className="mb-10">
        <DropZone />
      </div>

      <div className="glass p-6 rounded-2xl border border-white/10 mb-8 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
          <FileText size={20} />
        </div>
        <div>
          <h3 className="font-medium text-slate-200 mb-1">CV Library Integration</h3>
          <p className="text-sm text-slate-400">
            Sign in with Google to automatically save your base CV to Google Cloud Storage. 
            Your optimized CVs will be available for local download.
          </p>
          <div className="mt-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 size={16} /> Connected to Google
              </div>
            ) : (
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  console.log('Login Success:', credentialResponse);
                  setIsAuthenticated(true);
                  // Here we would typically send the token to the backend
                }}
                onError={() => {
                  console.error('Login Failed');
                }}
                theme="filled_black"
                shape="pill"
                size="medium"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={nextStep} 
          disabled={!cvFile}
          className="btn-primary"
        >
          Continue to Job Details <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}
