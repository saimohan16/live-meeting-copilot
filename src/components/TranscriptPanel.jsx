'use client';

import { useEffect, useRef } from 'react';

export default function TranscriptPanel({ entries, isRecording }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-700/50">
        <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-coral recording-pulse' : 'bg-surface-700'}`} />
        <h2 className="text-sm font-semibold text-surface-200 uppercase tracking-wider">Transcript</h2>
        {isRecording && (
          <span className="text-xs text-coral/70 font-mono ml-auto">LIVE</span>
        )}
      </div>

      {/* Transcript body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-200/40 text-sm text-center">
              {isRecording ? 'Listening...' : 'Click the mic to start recording'}
            </p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className="animate-fade-in">
              <span className="text-[10px] font-mono text-surface-200/30 block mb-0.5">
                {entry.timestamp}
              </span>
              <p className="text-sm text-surface-50/90 leading-relaxed">{entry.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
