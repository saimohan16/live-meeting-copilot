'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import TranscriptPanel from '../components/TranscriptPanel';
import SuggestionsPanel from '../components/SuggestionsPanel';
import ChatPanel from '../components/ChatPanel';
import SettingsModal from '../components/SettingsModal';
import { DEFAULT_SETTINGS } from '../lib/defaults';
import { AudioRecorder } from '../lib/audioRecorder';
import { transcribeAudio, generateSuggestions, streamChatResponse } from '../lib/groq';

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function Home() {
  // Settings
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(null);

  // Transcript
  const [transcriptEntries, setTranscriptEntries] = useState([]);
  const fullTranscriptRef = useRef('');

  // Suggestions
  const [suggestionBatches, setSuggestionBatches] = useState([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const batchIdRef = useRef(0);
  const suggestionBatchesRef = useRef([]);
  useEffect(() => { suggestionBatchesRef.current = suggestionBatches; }, [suggestionBatches]);

  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatStreaming, setIsChatStreaming] = useState(false);

  // Auto-refresh countdown
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Transcription in progress flag
  const isTranscribingRef = useRef(false);

  // --- Countdown timer logic (tracks suggestion refresh, not transcription) ---
  const startCountdown = useCallback(() => {
    const seconds = 30; // suggestion interval
    countdownRef.current = seconds;
    setCountdown(seconds);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        countdownRef.current = 30;
      }
      setCountdown(countdownRef.current);
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  }, []);

  // --- Audio chunk handler (transcription only — suggestions run on separate timer) ---
  const handleAudioChunk = useCallback(async (blob) => {
    if (isTranscribingRef.current) return;
    isTranscribingRef.current = true;

    try {
      const s = settingsRef.current;
      const text = await transcribeAudio(blob, s.groqApiKey);
      if (text) {
        const entry = { text, timestamp: formatTime() };
        setTranscriptEntries((prev) => [...prev, entry]);
        fullTranscriptRef.current += (fullTranscriptRef.current ? '\n' : '') + text;
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setTranscriptEntries((prev) => [
        ...prev,
        { text: `[Transcription error: ${err.message}]`, timestamp: formatTime() },
      ]);
    } finally {
      isTranscribingRef.current = false;
    }
  }, []);

  // --- Suggestion auto-refresh timer (separate from transcription) ---
  const suggestionTimerRef = useRef(null);

  const startSuggestionTimer = useCallback(() => {
    if (suggestionTimerRef.current) clearInterval(suggestionTimerRef.current);
    suggestionTimerRef.current = setInterval(() => {
      if (fullTranscriptRef.current) {
        refreshSuggestions(fullTranscriptRef.current);
      }
    }, 30000); // suggestions every 30s
  }, []);

  const stopSuggestionTimer = useCallback(() => {
    if (suggestionTimerRef.current) {
      clearInterval(suggestionTimerRef.current);
      suggestionTimerRef.current = null;
    }
  }, []);

  // --- Start/stop recording ---
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      recorderRef.current = null;
      setIsRecording(false);
      stopCountdown();
      stopSuggestionTimer();
      return;
    }

    const s = settingsRef.current;
    if (!s.groqApiKey) {
      setShowSettings(true);
      return;
    }

    const recorder = new AudioRecorder({
      onAudioChunk: handleAudioChunk,
      intervalMs: 10000, // transcript every 10 seconds
    });

    try {
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      startCountdown();
      startSuggestionTimer();
    } catch (err) {
      alert(err.message);
    }
  }, [isRecording, handleAudioChunk, startCountdown, stopCountdown, startSuggestionTimer, stopSuggestionTimer]);

  // --- Refresh suggestions ---
  const refreshSuggestions = useCallback(async (transcriptOverride) => {
    const s = settingsRef.current;
    const transcript = transcriptOverride || fullTranscriptRef.current;
    if (!transcript || !s.groqApiKey) return;

    setIsSuggestionsLoading(true);
    try {
      const contextWindow = transcript.slice(-s.suggestionsContextWindow);
      
      // Pass previous batch's suggestions for anti-repetition
      const prevBatch = suggestionBatchesRef.current[0];
      const previousSuggestions = prevBatch ? prevBatch.suggestions : null;
      
      const suggestions = await generateSuggestions(contextWindow, s.suggestionPrompt, s.groqApiKey, previousSuggestions);

      if (suggestions.length > 0) {
        batchIdRef.current += 1;
        const batch = {
          id: batchIdRef.current,
          timestamp: formatTime(),
          suggestions,
        };
        setSuggestionBatches((prev) => [batch, ...prev]);
      }
    } catch (err) {
      console.error('Suggestion error:', err);
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (recorderRef.current?.isRecording) {
      await recorderRef.current.flush();
      await new Promise((r) => setTimeout(r, 500));
    }
    refreshSuggestions();
  }, [refreshSuggestions]);

  // --- Suggestion click -> chat ---
  const handleSuggestionClick = useCallback(async (suggestion, batch) => {
    if (isChatStreaming) return;

    const s = settingsRef.current;
    const userMsg = {
      role: 'user',
      content: suggestion.preview,
      suggestionType: suggestion.type,
      timestamp: formatTime(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    setIsChatStreaming(true);
    const assistantMsg = { role: 'assistant', content: '', timestamp: formatTime() };
    setChatMessages((prev) => [...prev, assistantMsg]);

    const transcript = fullTranscriptRef.current.slice(-s.detailedAnswerContextWindow);
    const messages = [
      { role: 'system', content: s.detailedAnswerPrompt },
      {
        role: 'user',
        content: `Meeting transcript so far:\n\n${transcript}\n\n---\n\nSuggestion type: ${suggestion.type}\nSuggestion: ${suggestion.preview}\n\n${suggestion.detail_prompt || 'Provide a detailed, helpful response about this suggestion.'}`,
      },
    ];

    try {
      const result = await streamChatResponse(messages, s.groqApiKey, (_, fullText) => {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText };
          return updated;
        });
      });
      if (!result || result.trim() === '') {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: '_Response empty — API may be busy. Try clicking again in a few seconds._' };
          return updated;
        });
      }
    } catch (err) {
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: `Error: ${err.message}` };
        return updated;
      });
    } finally {
      setIsChatStreaming(false);
    }
  }, [isChatStreaming]);

  // --- Free-text chat ---
  const handleSendChatMessage = useCallback(async (text) => {
    if (isChatStreaming) return;

    const s = settingsRef.current;
    const userMsg = { role: 'user', content: text, timestamp: formatTime() };
    setChatMessages((prev) => [...prev, userMsg]);

    setIsChatStreaming(true);
    const assistantMsg = { role: 'assistant', content: '', timestamp: formatTime() };
    setChatMessages((prev) => [...prev, assistantMsg]);

    const transcript = fullTranscriptRef.current.slice(-s.detailedAnswerContextWindow);
    const messages = [
      { role: 'system', content: s.chatPrompt },
      { role: 'user', content: `Meeting transcript so far:\n\n${transcript}\n\n---\n\nUser question: ${text}` },
    ];

    try {
      await streamChatResponse(messages, s.groqApiKey, (_, fullText) => {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText };
          return updated;
        });
      });
    } catch (err) {
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: `Error: ${err.message}` };
        return updated;
      });
    } finally {
      setIsChatStreaming(false);
    }
  }, [isChatStreaming]);

  // --- Export session ---
  const exportSession = useCallback(() => {
    const session = {
      exported_at: new Date().toISOString(),
      transcript: transcriptEntries,
      suggestion_batches: suggestionBatches.map((b) => ({
        timestamp: b.timestamp,
        suggestions: b.suggestions,
      })),
      chat_history: chatMessages,
    };

    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-copilot-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transcriptEntries, suggestionBatches, chatMessages]);

  // --- New session (clear everything) ---
  const newSession = useCallback(() => {
    if (isRecording) {
      recorderRef.current?.stop();
      recorderRef.current = null;
      setIsRecording(false);
      stopCountdown();
    }
    setTranscriptEntries([]);
    fullTranscriptRef.current = '';
    setSuggestionBatches([]);
    batchIdRef.current = 0;
    setChatMessages([]);
  }, [isRecording, stopCountdown]);

  return (
    <div className="h-screen flex flex-col bg-surface-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-surface-700/40 bg-surface-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">T</span>
          </div>
          <span className="text-sm font-semibold text-surface-50 tracking-tight">Meeting Copilot</span>
        </div>

        <div className="flex items-center gap-3">
          {/* New Session */}
          <button
            onClick={newSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-200 hover:text-surface-50 border border-surface-700/50 hover:border-surface-200/30 hover:bg-surface-800 transition-all"
            title="Start new session"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>

          {/* Export button */}
          <button
            onClick={exportSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-200 hover:text-surface-50 border border-surface-700/50 hover:border-surface-200/30 hover:bg-surface-800 transition-all"
            title="Export session (transcript + suggestions + chat)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-200 hover:text-surface-50 border border-surface-700/50 hover:border-surface-200/30 hover:bg-surface-800 transition-all"
            title="Settings"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>

          {/* Mic button */}
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
              isRecording
                ? 'bg-coral/15 text-coral border border-coral/30 recording-pulse'
                : 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25'
            }`}
          >
            {isRecording ? (
              <>
                <span className="w-2.5 h-2.5 rounded-sm bg-coral" />
                Stop
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
                Record
              </>
            )}
          </button>

          {/* API key indicator */}
          {!settings.groqApiKey && (
            <span className="text-[10px] text-coral/70 font-medium">No API key</span>
          )}
        </div>
      </header>

      {/* Main 3-column layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Transcript */}
        <div className="w-[30%] min-w-[280px] border-r border-surface-700/40 bg-surface-900/40">
          <TranscriptPanel entries={transcriptEntries} isRecording={isRecording} />
        </div>

        {/* Middle: Suggestions */}
        <div className="w-[35%] min-w-[320px] border-r border-surface-700/40 bg-surface-950/50">
          <SuggestionsPanel
            batches={suggestionBatches}
            onSuggestionClick={handleSuggestionClick}
            isLoading={isSuggestionsLoading}
            onRefresh={handleManualRefresh}
            countdown={countdown}
            isRecording={isRecording}
          />
        </div>

        {/* Right: Chat */}
        <div className="flex-1 min-w-[300px] bg-surface-900/30">
          <ChatPanel
            messages={chatMessages}
            onSendMessage={handleSendChatMessage}
            isStreaming={isChatStreaming}
          />
        </div>
      </main>

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}