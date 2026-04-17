# Meeting Copilot — Live Suggestions

A real-time AI meeting assistant that listens to live audio, transcribes it, and surfaces contextual suggestions every 30 seconds. Built for the TwinMind Live Suggestions assignment.

## Live Demo

**Deployed URL:** [live-meeting-copilot.vercel.app](https://live-meeting-copilot.vercel.app)

## Quick Start

```bash
git clone https://github.com/saimohan16/live-meeting-copilot.git
cd live-meeting-copilot
npm install
npm run dev
```

Open `http://localhost:3000` → click **Settings** → paste your Groq API key → click **Record**.

## Stack

- **Frontend:** Next.js 14 (App Router) + React 18 + Tailwind CSS
- **Transcription:** Groq Whisper Large V3
- **LLM:** Groq GPT-OSS 120B (suggestions + chat)
- **Audio Capture:** Browser MediaRecorder API
- **Deployment:** Vercel

## Architecture

```
Audio Pipeline (every 10s):
  Mic → MediaRecorder → 10s audio blob → Groq Whisper → transcript text → append

Suggestion Pipeline (every 30s, independent):
  Recent transcript (last 6K chars) + previous batch → GPT-OSS 120B → 3 typed suggestion cards

Chat Pipeline (on click or user question):
  Full transcript (last 12K chars) + suggestion detail_prompt → GPT-OSS 120B → formatted response
```

### Key Design Decision: Decoupled Pipelines

Transcript updates every **10 seconds** so the UI feels live, but suggestions generate every **30 seconds** on a separate timer. This keeps the app responsive — transcription and suggestion generation never block each other, and API rate limits are respected (6 transcription + 2 suggestion calls/min = 8 total, well within Groq's 30 req/min free tier).

## Prompt Strategy

### The "Brilliant Colleague" Approach

The core insight: suggestions should feel like a smart colleague whispering in your ear during a meeting — not an AI grading your conversation. Every suggestion must **react to what was just said**, not offer generic advice.

### Reactive Suggestion Engine

The suggestion prompt analyzes the transcript and picks 3 suggestions, each a **different type**:

| Type | When to use | Example |
|------|------------|---------|
| **answer** | Someone asked a question | "Redis Cluster + consistent hashing handles ~1M ops/sec/node for state-in-memory issues." |
| **question** | Conversation needs to move forward | "Ask: What's the rollback plan if migration fails mid-sprint?" |
| **talking_point** | User can add relevant external knowledge | "Discord's sharding model: 2,500 guilds per shard, ~150k concurrent users each." |
| **fact_check** | Someone stated a clearly wrong fact | "Netflix uses custom infra on AWS, not vanilla K8s — the comparison is misleading." |
| **action_item** | Next steps are discussed but vague | "Action: Assign someone to benchmark ECS vs EKS with your container count by Friday." |
| **clarification** | Jargon or confusion detected | "NRR = Net Revenue Retention. Industry median for SaaS is ~110%." |

### Selection Logic

Priority-based rules determine the mix:
1. Open question exists → one suggestion **must** be an `answer`
2. Clearly wrong factual claim → one **should** be a `fact_check` (only when confident)
3. All 3 must be **different types** — hard constraint, no duplicates
4. Previous batch suggestions are passed as context to prevent repetition

### Grounding & Safety

- The model is instructed to never fact-check products, tools, or terms it doesn't recognize
- Fact-check verdicts include "Unverifiable" for claims the model can't confidently assess
- All responses must trace back to something specific in the transcript

### Context Windowing

| Pipeline | Window | Rationale |
|----------|--------|-----------|
| Suggestions | Last 6,000 chars (~4-8 min) | Recency-focused — what was just said matters most |
| Chat/Detail | Last 12,000 chars (~8-15 min) | Broader context for thorough answers |

Both are configurable in Settings.

### Anti-Repetition

Each suggestion call receives the previous batch's suggestions in the user message with explicit instructions not to repeat them. This ensures batch 2 is always different from batch 1, even if the transcript hasn't changed significantly.

### Chat Response Format: "Sticky Note" Design

Detail responses follow a strict format optimized for glanceability during a live meeting:

```
**[Bold one-sentence takeaway]**
• Supporting point 1
• Supporting point 2
• Supporting point 3
💬 "Ready-to-say sentence for the meeting"
```

Capped at 60-120 words. The user is mid-conversation and will read this for 5-15 seconds.

## Tradeoffs

| Decision | Tradeoff | Why |
|----------|----------|-----|
| 10s transcript / 30s suggestions | More Whisper calls, but UI feels live | Decoupled pipelines keep the app responsive |
| Non-streaming chat responses | No word-by-word animation | GPT-OSS 120B streaming returned empty responses; non-streaming is reliable |
| `response_format: json_object` | Slight latency increase | Guarantees parseable suggestion output every time |
| Temperature 0.7 suggestions / 0.6 chat | Suggestions more varied, chat more focused | Different tasks need different creativity levels |
| 6K/12K context windows (not larger) | Less historical context | Faster API responses, lower token usage, recency > history |
| Client-side API calls (no backend) | API key visible in network tab | Assignment says no persistence/login needed; user provides their own key |
| Whisper hallucination filtering | May filter rare legitimate short utterances | Prevents "Thank you" spam during silence — worth the tradeoff |

## Features

- **Decoupled transcript (10s) and suggestions (30s)** — live feel without suggestion spam
- **Auto-refresh countdown** — visible timer shows when next suggestions arrive
- **New Session button** — clear everything and start fresh without reloading
- **Export button** — download full session (transcript + suggestions + chat) as JSON with timestamps
- **Settings screen** — editable prompts, context windows, API key
- **Batch separators with fading** — newest batch at full opacity, older batches fade
- **Type-specific card styling** — color-coded left accent bars and labels
- **Chat role labels** — shows "YOU · QUESTION" or "YOU · FACT CHECK" when clicking suggestion cards
- **Whisper hallucination filtering** — filters "Thank you", "Bye", etc. on silence
- **Anti-repetition** — previous batch passed as context to avoid duplicate suggestions
- **Grounded responses** — model says "Unverifiable" instead of hallucinating incorrect fact-checks

## Export Format

```json
{
  "exported_at": "2026-04-17T...",
  "transcript": [
    { "text": "So we're talking about scaling...", "timestamp": "15:09:11" }
  ],
  "suggestion_batches": [
    {
      "timestamp": "15:09:38",
      "suggestions": [
        { "type": "answer", "preview": "Redis Cluster handles ~1M ops/sec/node...", "detail_prompt": "..." }
      ]
    }
  ],
  "chat_history": [
    { "role": "user", "content": "...", "suggestionType": "fact_check", "timestamp": "15:10:00" },
    { "role": "assistant", "content": "...", "timestamp": "15:10:02" }
  ]
}
```

## What I'd Improve

- **Speaker diarization** — label who said what using a separate diarization model
- **Streaming chat responses** — investigate GPT-OSS 120B streaming reliability or fall back to a different model for chat
- **Suggestion quality feedback loop** — track which suggestions users click to learn what's useful
- **Longer sessions** — implement transcript summarization for meetings >30 min to keep context windows effective
- **Mobile responsive layout** — current 3-column design works on desktop only