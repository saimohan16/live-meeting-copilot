'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { SUGGESTION_TYPE_META } from '../lib/defaults';

export default function ChatPanel({ messages, onSendMessage, isStreaming }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    onSendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-700/50">
        <h2 className="text-sm font-semibold text-surface-200 uppercase tracking-wider">Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-200/40 text-sm text-center">
              Click a suggestion or ask a question
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="animate-fade-in">
            {msg.role === 'user' ? (
              <div>
                {/* Role label with suggestion type if from a clicked card */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-200/50">You</span>
                  {msg.suggestionType && (
                    <>
                      <span className="text-[10px] text-surface-200/20">·</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${(SUGGESTION_TYPE_META[msg.suggestionType] || {}).color || 'text-surface-200/50'}`}>
                        {(SUGGESTION_TYPE_META[msg.suggestionType] || {}).label || msg.suggestionType}
                      </span>
                    </>
                  )}
                </div>
                <div className="bg-accent/10 border border-accent/15 rounded-xl px-3.5 py-2.5">
                  <p className="text-sm text-surface-50">{msg.content}</p>
                  <span className="text-[10px] font-mono text-surface-200/25 mt-1.5 block text-right">{msg.timestamp}</span>
                </div>
              </div>
            ) : (
              <div>
                {/* Assistant label */}
                <div className="mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-200/50">Assistant</span>
                </div>
                <div className="bg-surface-800/50 border border-surface-700/30 rounded-xl px-3.5 py-2.5">
                  <div className="markdown-content text-sm text-surface-50/85 leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  <span className="text-[10px] font-mono text-surface-200/25 mt-1.5 block">{msg.timestamp}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex items-center gap-1.5 text-accent/60 text-xs pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-pulse" style={{ animationDelay: '0.15s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-pulse" style={{ animationDelay: '0.3s' }} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-surface-700/50">
        <div className="flex items-end gap-2 bg-surface-800/80 border border-surface-700/50 rounded-xl px-3 py-2 focus-within:border-accent/40 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the meeting..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-surface-50 placeholder-surface-200/30 resize-none focus:outline-none max-h-24"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-accent flex items-center justify-center disabled:opacity-30 hover:bg-accent-dark transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
