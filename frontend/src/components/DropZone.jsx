import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import toast from 'react-hot-toast';

export default function DropZone() {
  const { cvFile, setCvFile, setCvText, setCvFormat, setIsLatex } = useAppStore();

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setCvFile(file);
    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading('Uploading and parsing CV...');
    
    try {
      const res = await fetch('/api/upload-cv', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to parse CV');
      }

      setCvText(data.text);
      setCvFormat(data.format);
      setIsLatex(data.is_latex);
      toast.success('CV parsed successfully!', { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
      setCvFile(null);
    }
  }, [setCvFile, setCvText, setCvFormat, setIsLatex]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/x-tex': ['.tex']
    },
    maxFiles: 1
  });

  return (
    <div 
      {...getRootProps()} 
      className={`glass border-2 border-dashed p-10 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300
        ${isDragActive ? 'border-brand-500 bg-brand-500/5 glow-blue' : 'border-white/20 hover:border-brand-400/50 hover:bg-white/5'}
        ${cvFile ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
    >
      <input {...getInputProps()} />
      
      {cvFile ? (
        <>
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-emerald-300">{cvFile.name}</h3>
            <p className="text-sm text-slate-400 mt-1">Ready for optimization</p>
          </div>
          <button 
            className="text-xs text-brand-400 hover:text-brand-300 underline mt-2"
            onClick={(e) => {
              e.stopPropagation();
              setCvFile(null);
              setCvText('');
            }}
          >
            Upload a different file
          </button>
        </>
      ) : (
        <>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors
            ${isDragActive ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-slate-400'}`}>
            <UploadCloud size={32} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-slate-200">Drag & drop your CV here</h3>
            <p className="text-sm text-slate-400 mt-1">Supports PDF, TXT, MD, and TEX</p>
          </div>
        </>
      )}
    </div>
  );
}
