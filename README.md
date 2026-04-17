# TwinMind — Live Suggestions

AI-powered real-time meeting copilot that listens to your conversation and surfaces contextual suggestions as you talk.

## Live Demo

**Deployed URL:** _(add your Vercel URL here after deploying)_

## Stack

- **Frontend:** Next.js 14 (App Router) + React 18 + Tailwind CSS
- **Transcription:** Groq Whisper Large V3
- **LLM:** Groq GPT-OSS 120B (suggestions + chat)
- **Audio:** Browser MediaRecorder API
- **Deploy:** Vercel

## Setup

```bash
git clone <your-repo-url>
cd twinmind-live-suggestions
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click Settings (gear icon), paste your Groq API key, and hit Record.

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Transcript  │    │  Suggestions │    │    Chat      │
│  (Left)      │    │  (Middle)    │    │  (Right)     │
│              │    │              │    │              │
│  Mic → Blob  │───▶│  Transcript  │───▶│  Click card  │
│  → Whisper   │    │  → GPT-OSS   │    │  → GPT-OSS   │
│  → Text      │    │  → 3 cards   │    │  → Stream     │
└─────────────┘    └──────────────┘    └─────────────┘
```

### Audio Pipeline
1. `MediaRecorder` captures mic audio in 30-second chunks (configurable)
2. Each chunk is sent to Groq's Whisper Large V3 for transcription
3. Transcribed text appends to the running transcript

### Suggestion Engine
After each transcription chunk, the recent transcript (last 8,000 chars by default) is sent to GPT-OSS 120B with a structured prompt that:
- Analyzes conversation phase (opening, deep-dive, Q&A, brainstorming, etc.)
- Identifies unanswered questions, factual claims, and action items
- Picks the optimal **mix** of 3 suggestion types from: question, talking_point, answer, fact_check, action_item, clarification
- Returns structured JSON with preview text and a detail prompt for each

### Chat / Detail Answers
- Clicking a suggestion card sends its `detail_prompt` + full transcript context to GPT-OSS 120B
- Responses are **streamed** for fast first-token latency
- Users can also type free-text questions

## Prompt Strategy

### Why structured suggestion types matter
Rather than asking the LLM for "3 suggestions," the prompt defines 6 distinct suggestion types with clear semantics. The LLM must:
1. Analyze context to determine what's happening
2. Choose the right **mix** of types (not 3 questions every time)
3. Prioritize recency — the most recent 30s matters most
4. If a question was asked → one suggestion MUST be an answer
5. If a factual claim was made → consider fact-checking it

### Context windowing
- **Suggestions:** Last 8,000 characters — enough for ~5-10 minutes of conversation, focused on recency
- **Detail/Chat:** Last 16,000 characters — broader context for thorough answers

These are configurable in Settings to experiment with different values.

### Tradeoffs
- **JSON output mode** (`response_format: json_object`) ensures parseable suggestions but slightly increases latency
- **Temperature 0.7** for suggestions (creative variety) vs **0.6** for chat (more focused answers)
- **Streaming** for chat responses (fast first-token) vs **non-streaming** for suggestions (need complete JSON)

## Features

- **Start/Stop mic** with visual recording indicator
- **Auto-refresh** suggestions every 30s during recording
- **Manual refresh** button flushes audio and regenerates suggestions
- **Suggestion cards** with type-specific styling and icons
- **Streaming chat** with markdown rendering
- **Session export** (JSON) with full transcript, all suggestion batches, and chat history with timestamps
- **Editable settings** for all prompts, context windows, and intervals
- **No backend** — all API calls go directly to Groq from the browser

## Export Format

```json
{
  "exported_at": "2026-04-16T...",
  "transcript": [
    { "text": "...", "timestamp": "14:30:05" }
  ],
  "suggestion_batches": [
    {
      "timestamp": "14:30:35",
      "suggestions": [
        { "type": "question", "preview": "...", "detail_prompt": "..." }
      ]
    }
  ],
  "chat_history": [
    { "role": "user", "content": "...", "timestamp": "14:31:00" },
    { "role": "assistant", "content": "...", "timestamp": "14:31:01" }
  ]
}
```

## Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo to Vercel for auto-deploy on push.
