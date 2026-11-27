import { createGeminiCaller } from './gemini.ts';

const prompt = { system: 'sys', user: 'usr' };

const okResponse = () =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"status":"rejected","reason_vi":"x"}' }] } }],
      usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

test('parses text part and token usage', async () => {
  const fetchImpl = vi.fn(async () => okResponse());
  const call = createGeminiCaller({ apiKey: 'k', model: 'gemini-x', fetchImpl: fetchImpl as unknown as typeof fetch });
  const res = await call(prompt);
  expect(res).toEqual({ json: { status: 'rejected', reason_vi: 'x' }, inputTokens: 120, outputTokens: 30, model: 'gemini-x' });
  const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent');
  expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('k');
  const body = JSON.parse(init.body as string);
  expect(body.systemInstruction.parts[0].text).toBe('sys');
  expect(body.generationConfig.responseMimeType).toBe('application/json');
});

test('throws on non-200', async () => {
  const fetchImpl = vi.fn(async () => new Response('quota', { status: 429 }));
  const call = createGeminiCaller({ apiKey: 'k', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch });
  await expect(call(prompt)).rejects.toThrow(/429/);
});

test('aborts after timeout', async () => {
  const fetchImpl = vi.fn((_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
  const call = createGeminiCaller({ apiKey: 'k', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 10 });
  await expect(call(prompt)).rejects.toThrow();
});

test('fake mode returns a valid graded payload without fetching', async () => {
  const fetchImpl = vi.fn();
  const call = createGeminiCaller({ apiKey: '', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch, fake: true });
  const res = await call(prompt);
  expect(fetchImpl).not.toHaveBeenCalled();
  expect((res.json as { status: string }).status).toBe('graded');
});

test('counts thinking tokens as output', async () => {
  const fetchImpl = vi.fn(async () =>
    new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{}' }] } }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40, thoughtsTokenCount: 300 },
    }), { status: 200 }));
  const call = createGeminiCaller({ apiKey: 'k', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch });
  expect((await call(prompt)).outputTokens).toBe(340);
});

test('keeps token counts when the JSON text is invalid', async () => {
  const fetchImpl = vi.fn(async () =>
    new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"status": "graded", oops' }] } }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40 },
    }), { status: 200 }));
  const call = createGeminiCaller({ apiKey: 'k', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch });
  const res = await call(prompt);
  expect(res.inputTokens).toBe(100);
  expect(typeof res.json).toBe('string');
});
