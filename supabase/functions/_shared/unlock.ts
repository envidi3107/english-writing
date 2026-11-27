import { isPassed } from './scoring.ts';

export interface CurriculumExercise {
  id: string;
  position: number;
  is_published: boolean;
  created_at: string;
  /** When the row was last switched to published (null/absent for legacy rows). */
  published_at?: string | null;
  /** When learners could first see it: latest published_at of exercise, topic and level. Set by buildSequence. */
  visible_since?: string;
}
type Publishable = { position: number; is_published: boolean; published_at?: string | null };
export interface CurriculumTopic extends Publishable { id: string; exercises: CurriculumExercise[] }
export interface CurriculumLevel extends Publishable { id: string; topics: CurriculumTopic[] }
/** completedAt = the first time the learner reached the pass threshold. */
export interface ProgressEntry { bestStars: number; completedAt: string | null }

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;
const latest = (...dates: Array<string | null | undefined>) =>
  dates.filter((d): d is string => !!d).reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));

/** Flattens published levels → topics → exercises into learning order. */
export function buildSequence<E extends CurriculumExercise>(
  levels: Array<Publishable & { topics: Array<Publishable & { exercises: E[] }> }>,
): E[] {
  const out: E[] = [];
  for (const level of [...levels].filter((l) => l.is_published).sort(byPosition)) {
    for (const topic of [...level.topics].filter((t) => t.is_published).sort(byPosition)) {
      for (const e of [...topic.exercises].filter((x) => x.is_published).sort(byPosition)) {
        out.push({ ...e, visible_since: latest(e.created_at, e.published_at, topic.published_at, level.published_at) });
      }
    }
  }
  return out;
}

/**
 * An exercise is open when the gate before it is open, or when the learner already has
 * progress on it or anything after it (so admin edits never re-lock reached content).
 * An exercise that became visible after the learner passed its predecessor does not close the gate.
 */
export function computeOpenExercises(
  seq: CurriculumExercise[],
  progress: Map<string, ProgressEntry>,
): Set<string> {
  const hasLater: boolean[] = new Array(seq.length).fill(false);
  for (let i = seq.length - 1; i >= 0; i--) {
    hasLater[i] = progress.has(seq[i].id) || (i + 1 < seq.length && hasLater[i + 1]);
  }

  const open = new Set<string>();
  let gate = true;
  let lastPassedAt: string | null = null;
  seq.forEach((e, i) => {
    if (gate || hasLater[i]) open.add(e.id);
    const p = progress.get(e.id);
    if (p && isPassed(p.bestStars)) {
      gate = true;
      lastPassedAt = p.completedAt;
    } else if (gate && lastPassedAt !== null && Date.parse(e.visible_since ?? e.created_at) > Date.parse(lastPassedAt)) {
      gate = true;
    } else {
      gate = false;
    }
  });
  return open;
}
