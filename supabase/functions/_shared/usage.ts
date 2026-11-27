import { vnDateString } from './streak.ts';

export interface UsageInput {
  created_at: string;
  input_tokens: number;
  output_tokens: number;
}

export interface UsageSummary {
  todayRequests: number;
  todayTokens: number;
  monthRequests: number;
  monthTokens: number;
  /** Last 30 Vietnam-time days, oldest first, zero-filled. */
  daily: { date: string; requests: number; tokens: number }[];
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface DailyUsage {
  /** Vietnam calendar date 'YYYY-MM-DD'. */
  date: string;
  requests: number;
  tokens: number;
}

/** Builds the summary from per-day buckets (e.g. the my_usage_daily RPC). */
export function summarizeDaily(rows: DailyUsage[], now: Date): UsageSummary {
  const today = vnDateString(now);
  const month = today.slice(0, 7);
  const daily = Array.from({ length: 30 }, (_, i) => ({ date: shiftDate(today, i - 29), requests: 0, tokens: 0 }));
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const summary: UsageSummary = { todayRequests: 0, todayTokens: 0, monthRequests: 0, monthTokens: 0, daily };

  for (const r of rows) {
    const requests = Number(r.requests) || 0;
    const tokens = Number(r.tokens) || 0;
    const bucket = byDate.get(r.date);
    if (bucket) {
      bucket.requests += requests;
      bucket.tokens += tokens;
    }
    if (r.date === today) {
      summary.todayRequests += requests;
      summary.todayTokens += tokens;
    }
    if (r.date.slice(0, 7) === month) {
      summary.monthRequests += requests;
      summary.monthTokens += tokens;
    }
  }
  return summary;
}

/** Same summary from raw usage-log rows. */
export function aggregateUsage(rows: UsageInput[], now: Date): UsageSummary {
  return summarizeDaily(
    rows.map((r) => ({
      date: vnDateString(new Date(r.created_at)),
      requests: 1,
      tokens: (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
    })),
    now,
  );
}

export function usageTone(used: number, budget: number): 'ok' | 'warn' | 'danger' {
  if (budget <= 0) return 'ok';
  const ratio = used / budget;
  if (ratio < 0.7) return 'ok';
  if (ratio <= 0.9) return 'warn';
  return 'danger';
}
