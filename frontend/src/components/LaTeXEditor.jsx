import React from 'react';
import Editor from '@monaco-editor/react';
import useAppStore from '../store/useAppStore';
import { Download } from 'lucide-react';

export default function LaTeXEditor() {
  const { editedLatex, setEditedLatex } = useAppStore();

  const handleDownload = () => {
    const blob = new Blob([editedLatex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized_cv.tex';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col glass rounded-xl border border-white/10 overflow-hidden">
      <div className="bg-surface-900 border-b border-white/10 p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">LaTeX Source</span>
          <span className="text-xs px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">Editable</span>
        </div>
        <button 
          onClick={handleDownload}
          className="btn-secondary text-xs px-3 py-1.5 h-auto rounded-lg flex items-center gap-1.5"
        >
          <Download size={14} />
          Download .tex
        </button>
      </div>
      <div className="flex-1 min-h-[500px]">
        <Editor
          height="100%"
          language="latex"
          theme="vs-dark"
          value={editedLatex}
          onChange={(val) => setEditedLatex(val || '')}
          options={{
            minimap: { enabled: false },
            wordWrap: 'on',
            fontSize: 13,
            lineHeight: 1.6,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
          }}
        />
      </div>
    </div>
  );
}
