import { aggregateUsage, summarizeDaily, usageTone } from './usage.ts';

const row = (created_at: string, input = 100, output = 50) => ({ created_at, input_tokens: input, output_tokens: output });

test('aggregateUsage buckets by VN date', () => {
  const now = new Date('2026-11-28T05:00:00Z');
  const s = aggregateUsage([row('2026-11-27T17:30:00Z'), row('2026-11-27T16:00:00Z')], now);
  expect(s.todayRequests).toBe(1);
  expect(s.todayTokens).toBe(150);
  expect(s.daily).toHaveLength(30);
  expect(s.daily[29]).toEqual({ date: '2026-11-28', requests: 1, tokens: 150 });
  expect(s.daily[28]).toEqual({ date: '2026-11-27', requests: 1, tokens: 150 });
  expect(s.daily[0].date).toBe('2026-10-30');
});

test('aggregateUsage month resets on VN month boundary', () => {
  const now = new Date('2026-12-01T01:00:00Z');
  const s = aggregateUsage([row('2026-11-30T16:30:00Z'), row('2026-11-30T17:30:00Z', 10, 10)], now);
  expect(s.monthRequests).toBe(1);
  expect(s.monthTokens).toBe(20);
});

test.each([
  [69, 100, 'ok'], [70, 100, 'warn'], [90, 100, 'warn'], [91, 100, 'danger'], [5, 0, 'ok'],
] as const)('usageTone(%d, %d) = %s', (used, budget, tone) => {
  expect(usageTone(used, budget)).toBe(tone);
});

test('summarizeDaily builds the summary from per-day buckets', () => {
  const now = new Date('2026-12-01T05:00:00Z');
  const s = summarizeDaily(
    [
      { date: '2026-12-01', requests: 1200, tokens: 900000 },
      { date: '2026-11-30', requests: 5, tokens: 100 },
      { date: '2026-10-01', requests: 9, tokens: 9 },
    ],
    now,
  );
  expect(s.todayRequests).toBe(1200);
  expect(s.todayTokens).toBe(900000);
  expect(s.monthRequests).toBe(1200);
  expect(s.daily).toHaveLength(30);
  expect(s.daily[28]).toEqual({ date: '2026-11-30', requests: 5, tokens: 100 });
});
