import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Loader2, Bot } from 'lucide-react';
import { ChatMessage, ReShapeResult } from '../types';
import { chatWithUrbanPlanner } from '../services/geminiService';

interface ChatAssistantProps {
  analysis: ReShapeResult | null;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ analysis }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await chatWithUrbanPlanner(messages, input, analysis);
      const botMsg: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error connecting to the planner AI." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-brand-panel border border-brand-surface rounded-xl shadow-2xl w-80 md:w-96 mb-4 flex flex-col overflow-hidden transition-all animate-in slide-in-from-bottom-5 fade-in duration-200 max-h-[70vh]">
          <div className="bg-brand-dark p-4 border-b border-brand-surface flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-brand-panel p-1.5 rounded-lg border border-brand-surface">
                <Bot size={18} className="text-brand-accent" />
              </div>
              <h3 className="font-semibold text-brand-text text-sm">ReShape Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-brand-muted hover:text-brand-text">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-panel scrollbar-thin min-h-[200px]">
            {messages.length === 0 && (
              <div className="text-center text-brand-muted text-sm mt-8 space-y-2">
                <p>👋 Hi! I'm ReShape AI.</p>
                <p>Ask me about costs, climate impacts, or details of the redesign levels.</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm border ${
                    msg.role === 'user' 
                      ? 'bg-brand-accent text-brand-dark rounded-tr-none border-brand-accent-hover' 
                      : 'bg-brand-surface text-brand-text rounded-tl-none border-brand-surface'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-brand-surface rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-2 border border-brand-surface">
                  <Loader2 size={14} className="animate-spin text-brand-accent" />
                  <span className="text-xs text-brand-muted">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-brand-dark border-t border-brand-surface shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask a question..."
                className="flex-1 bg-brand-panel border border-brand-surface rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent placeholder-brand-muted"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-50 text-brand-dark p-2 rounded-lg transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brand-accent hover:bg-brand-accent-hover text-brand-dark p-4 rounded-full shadow-lg shadow-brand-accent/20 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center border border-brand-surface"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};

export default ChatAssistant;