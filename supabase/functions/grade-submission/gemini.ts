import { GEMINI_RESPONSE_SCHEMA } from '../_shared/gradeResult.ts';
import type { GeminiCall } from './handler.ts';

interface CallerOptions {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Return a canned result instead of calling Gemini (local UI development). */
  fake?: boolean;
}

type Prompt = { system: string; user: string };

export function createGeminiCaller(opts: CallerOptions): (prompt: Prompt) => Promise<GeminiCall> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 30000;

  return async (prompt) => {
    if (opts.fake) return fakeCall(prompt, opts.model);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent`;
      const res = await fetchImpl(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': opts.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt.system }] },
          contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
            temperature: 0.3,
          },
        }),
      });
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') throw new Error('Gemini returned no text');
      return {
        json: JSON.parse(text),
        inputTokens: data?.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
        model: opts.model,
      };
    } finally {
      clearTimeout(timer);
    }
  };
}

const SUBJECT_3RD = String.raw`\b((?:my|his|her) (?:family|father|mother|brother|sister)|he|she|it)`;
const FAKE_FIXES: Array<[RegExp, (m: string) => string, string]> = [
  [new RegExp(`${SUBJECT_3RD} have\\b`, 'i'), (m) => m.replace(/have$/i, 'has'), 'Chủ ngữ số ít (he, she, my family…) đi với "has", không dùng "have".'],
  [new RegExp(`${SUBJECT_3RD} (work|like|live|go)\\b`, 'i'), (m) => m.replace(/(go)$/i, '$1es').replace(/(work|like|live)$/i, '$1s'), 'Chủ ngữ ngôi thứ ba số ít thì động từ thêm -s hoặc -es.'],
  [/(^|[.!?]\s+|\s)i(?=\s)/, (m) => m.replace(/i$/, 'I'), 'Đại từ "I" (tôi) luôn viết hoa.'],
];

function fakeCall(prompt: Prompt, model: string): GeminiCall {
  const answer = prompt.user.match(/<<<BAI_LAM\n([\s\S]*)\nBAI_LAM>>>/)?.[1] ?? '';
  let corrected = answer;
  const errors: Array<Record<string, string>> = [];
  for (const [re, fix, why] of FAKE_FIXES) {
    const m = corrected.match(re);
    if (m) {
      const fixed = fix(m[0]);
      corrected = corrected.replace(m[0], fixed);
      const clean = (s: string) => s.replace(/^[.!?]?\s*/, '').trim();
      errors.push({ original: clean(m[0]), correction: clean(fixed), type: 'grammar', explanation_vi: why });
    }
  }
  const score = errors.length ? 7 : 9;
  const crit = (key: string) => ({ key, score });
  return {
    json: {
      status: 'graded',
      overall_score: score,
      criteria: ['task', 'grammar', 'vocabulary', 'coherence', 'meaning', 'naturalness'].map(crit),
      corrected_text: corrected,
      errors,
      general_feedback_vi: 'Bài viết rõ ý, em đã dùng từ vựng đúng chủ đề. Hãy chú ý chia động từ theo chủ ngữ nhé! (Chế độ AI giả lập)',
      model_answer: 'My family has four people. My father works in a bank and my mother is a teacher. I love my family very much.',
    },
    inputTokens: Math.ceil((prompt.system.length + prompt.user.length) / 4),
    outputTokens: 250,
    model: `${model} (fake)`,
  };
}
