import React, { useState, useRef, useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { MessageSquare, X, Send, User, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatWidget() {
  const { chatOpen, setChatOpen, chatHistory, addChatMessage, sessionId } = useAppStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatOpen) scrollToBottom();
  }, [chatHistory, chatOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    addChatMessage({ role: 'user', content: userMsg });
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory,
          session_id: sessionId
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      addChatMessage({ role: 'assistant', content: data.reply });
    } catch (err) {
      addChatMessage({ role: 'assistant', content: `Error: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-900/40 z-50 transition-transform active:scale-95"
      >
        {chatOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] max-h-[calc(100vh-120px)] glass border border-white/10 shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-white/5 border-b border-white/10 p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-medium text-slate-100 text-sm">AI Career Advisor</h3>
                <p className="text-xs text-slate-400">Ask about ATS tips, interviews, etc.</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-slate-500 text-sm mt-10">
                  <Bot size={32} className="mx-auto mb-3 opacity-50" />
                  <p>Hi! I'm your AI career advisor.</p>
                  <p>How can I help you optimize your CV today?</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white
                    ${msg.role === 'user' ? 'bg-brand-600' : 'bg-surface-800 border border-white/10'}`}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm
                    ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'glass bg-white/5 text-slate-200 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-surface-800 border border-white/10 flex items-center justify-center text-white">
                    <Bot size={14} />
                  </div>
                  <div className="px-4 py-3 rounded-2xl glass bg-white/5 text-slate-400 rounded-tl-none flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-surface-950/50">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 w-8 flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-400 text-white disabled:opacity-50 disabled:hover:bg-brand-500 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
