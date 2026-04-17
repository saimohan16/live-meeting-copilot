/**
 * Groq API integration layer.
 * All LLM and transcription calls go through here.
 */

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

/**
 * Transcribe audio blob using Whisper Large V3 via Groq.
 */
export async function transcribeAudio(audioBlob, apiKey) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');
  formData.append('language', 'en');

  const res = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Transcription failed: ${res.status}`);
  }

  const data = await res.json();
  const text = data.text?.trim() || '';

  // Filter Whisper hallucinations on silence/noise
  const hallucinations = [
    'thank you', 'thanks', 'you', 'bye', 'goodbye',
    'thank you for watching', 'thanks for watching',
    'subtitles by', 'translated by', 'amara org',
    'subscribe', 'like and subscribe', 'see you next time',
    'the end', 'music', 'applause', 'laughter',
    'ugh', 'hmm', 'um', 'uh', 'ah', 'oh',
    'yeah', 'yes', 'no', 'okay', 'ok',
  ];
  const cleaned = text.toLowerCase().replace(/[.,!?]/g, '').trim();
  if (hallucinations.includes(cleaned) || cleaned.length < 3) {
    return '';
  }

  return text;
}

/**
 * Generate suggestions from transcript context.
 * Returns parsed JSON array of 3 suggestions.
 */
export async function generateSuggestions(transcript, systemPrompt, apiKey, previousSuggestions = null) {
  let userContent = `Here is the recent meeting transcript:\n\n${transcript}`;

  if (previousSuggestions && previousSuggestions.length > 0) {
    const prevList = previousSuggestions
      .map((s) => `- [${s.type}] ${s.preview}`)
      .join('\n');
    userContent += `\n\n---\nPREVIOUS SUGGESTIONS (do NOT repeat these — generate fresh, different suggestions):\n${prevList}`;
  }

  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Suggestion generation failed: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '[]';

  try {
    const parsed = JSON.parse(content);
    const suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || parsed.items || [];
    return suggestions.slice(0, 3);
  } catch {
    console.error('Failed to parse suggestions JSON:', content);
    return [];
  }
}

/**
 * Get a detailed answer or chat response.
 */
export async function streamChatResponse(messages, apiKey, onChunk) {
  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.6,
      max_tokens: 512,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Chat failed: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (content) {
    onChunk(content, content);
    return content;
  }

  const fallback = 'Unable to generate response right now. Try again in a moment.';
  onChunk(fallback, fallback);
  return fallback;
}