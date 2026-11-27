import type { ErrorType, GradeResult } from '@shared/types.ts';

export function countErrorTypes(results: GradeResult[]): { type: ErrorType; count: number }[] {
  const counts = new Map<ErrorType, number>();
  for (const r of results) {
    for (const e of Array.isArray(r?.errors) ? r.errors : []) {
      counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}
