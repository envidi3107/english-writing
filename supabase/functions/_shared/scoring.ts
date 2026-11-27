import type { Stars } from './types.ts';

export const PASS_STARS = 2;
const XP_BY_STARS = [0, 10, 20, 30] as const;

export function starsFromScore(score: number): Stars {
  if (score >= 8.5) return 3;
  if (score >= 6.5) return 2;
  if (score >= 5) return 1;
  return 0;
}

export function isPassed(stars: number): boolean {
  return stars >= PASS_STARS;
}

export function xpForStars(stars: number): number {
  return XP_BY_STARS[Math.max(0, Math.min(3, Math.floor(stars)))];
}

export function xpGain(prevBestStars: number, newStars: number): number {
  return Math.max(0, xpForStars(newStars) - xpForStars(prevBestStars));
}
