'use client';

import { SUGGESTION_TYPE_META } from '../lib/defaults';

const BATCH_OPACITY = [1, 0.85, 0.65, 0.45];
function batchOpacity(idx) {
  return idx < BATCH_OPACITY.length ? BATCH_OPACITY[idx] : 0.35;
}

export default function SuggestionsPanel({ batches, onSuggestionClick, isLoading, onRefresh, countdown, isRecording }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/50">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-surface-200 uppercase tracking-wider">Suggestions</h2>
          {batches.length > 0 && (
            <span className="text-[10px] font-mono text-surface-200/30 bg-surface-800/50 px-1.5 py-0.5 rounded">
              {batches.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh countdown */}
          {isRecording && countdown !== null && (
            <span className="text-[10px] font-mono text-surface-200/30">
              auto-refresh in {countdown}s
            </span>
          )}
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-accent bg-accent/8 hover:bg-accent/15 disabled:text-surface-200/30 disabled:bg-transparent border border-accent/15 disabled:border-surface-700/30 transition-all"
            title="Refresh suggestions"
          >
            <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Suggestions body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {/* Loading shimmer at top */}
        {isLoading && (
          <div className="space-y-2.5 animate-fade-in mb-4">
            <div className="h-3 w-16 shimmer-loading rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer-loading rounded-xl h-[72px] border border-surface-700/20" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {batches.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-800/60 flex items-center justify-center">
              <svg className="w-5 h-5 text-surface-200/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <p className="text-surface-200/40 text-sm text-center leading-relaxed">
              Suggestions will appear here<br />as you start talking
            </p>
          </div>
        )}

        {/* Suggestion batches — newest first, older ones faded */}
        {batches.map((batch, batchIdx) => {
          const opacity = batchOpacity(batchIdx);
          const isNewest = batchIdx === 0;
          const batchNumber = batches.length - batchIdx;

          return (
            <div key={batch.id} style={{ opacity }}>
              {/* Batch separator (shown ABOVE each batch except the newest) */}
              {!isNewest && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-surface-700/30" />
                  <span className="text-[10px] font-mono text-surface-200/25 whitespace-nowrap">
                    Batch {batchNumber} · {batch.timestamp}
                  </span>
                  <div className="flex-1 h-px bg-surface-700/30" />
                </div>
              )}

              <div className={`space-y-2.5 ${isNewest ? 'animate-slide-down' : ''}`}>
                {/* Timestamp + Latest badge for newest batch */}
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-mono text-surface-200/40">
                    {batch.timestamp}
                  </span>
                  {isNewest && !isLoading && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-accent/70 bg-accent/8 px-1.5 py-0.5 rounded">
                      Latest
                    </span>
                  )}
                </div>

                {/* 3 suggestion cards */}
                {batch.suggestions.map((suggestion, sIdx) => {
                  const meta = SUGGESTION_TYPE_META[suggestion.type] || SUGGESTION_TYPE_META.talking_point;
                  return (
                    <button
                      key={sIdx}
                      onClick={() => onSuggestionClick(suggestion, batch)}
                      className={`suggestion-card w-full text-left rounded-xl border ${meta.border} ${meta.bg} px-3.5 py-3 group relative overflow-hidden`}
                    >
                      {/* Left accent bar */}
                      <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${meta.color.replace('text-', 'bg-')} opacity-50`} />

                      <div className="flex items-start gap-2.5 pl-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
                              {meta.icon} {meta.label}
                            </span>
                          </div>
                          <p className="text-[13px] text-surface-50/90 leading-snug">
                            {suggestion.preview}
                          </p>
                        </div>

                        {/* Click affordance */}
                        <div className="flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-surface-200/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
