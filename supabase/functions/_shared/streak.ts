const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Calendar date ('YYYY-MM-DD') in Vietnam time (UTC+7). */
export function vnDateString(now: Date): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nextStreak(
  prev: { count: number; lastActiveDate: string | null },
  now: Date,
): { count: number; lastActiveDate: string } {
  const today = vnDateString(now);
  if (prev.lastActiveDate === today) return { count: Math.max(1, prev.count), lastActiveDate: today };
  if (prev.lastActiveDate && addDays(prev.lastActiveDate, 1) === today) {
    return { count: prev.count + 1, lastActiveDate: today };
  }
  return { count: 1, lastActiveDate: today };
}

/** Streak to show right now: a streak whose last activity is older than yesterday (VN time) has lapsed. */
export function displayStreak(profile: { streak_count: number; last_active_date: string | null }, now: Date): number {
  const today = vnDateString(now);
  const last = profile.last_active_date;
  if (!last) return 0;
  return last === today || addDays(last, 1) === today ? profile.streak_count : 0;
}
