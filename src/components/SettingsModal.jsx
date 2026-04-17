'use client';

import { useState } from 'react';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [local, setLocal] = useState({ ...settings });

  const update = (key, val) => setLocal((s) => ({ ...s, [key]: val }));

  const fields = [
    { key: 'groqApiKey', label: 'Groq API Key', type: 'password', placeholder: 'gsk_...' },
    { key: 'transcriptionInterval', label: 'Transcription Interval (seconds)', type: 'number' },
    { key: 'suggestionsContextWindow', label: 'Suggestions Context Window (chars)', type: 'number' },
    { key: 'detailedAnswerContextWindow', label: 'Detail/Chat Context Window (chars)', type: 'number' },
  ];

  const textAreas = [
    { key: 'suggestionPrompt', label: 'Live Suggestion Prompt' },
    { key: 'detailedAnswerPrompt', label: 'Detailed Answer Prompt (on click)' },
    { key: 'chatPrompt', label: 'Chat Prompt (free text questions)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-surface-900 border-b border-surface-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-surface-50">Settings</h2>
          <button onClick={onClose} className="text-surface-200 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-surface-200 mb-1.5">{label}</label>
              <input
                type={type}
                value={local[key]}
                placeholder={placeholder}
                onChange={(e) => update(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-50 placeholder-surface-200/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
              />
            </div>
          ))}

          {textAreas.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-surface-200 mb-1.5">{label}</label>
              <textarea
                value={local[key]}
                onChange={(e) => update(key, e.target.value)}
                rows={8}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-xs font-mono text-surface-50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 resize-y"
              />
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-surface-900 border-t border-surface-700 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-200 hover:text-white rounded-lg border border-surface-700 hover:border-surface-200/40 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave(local); onClose(); }}
            className="px-5 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-dark transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
