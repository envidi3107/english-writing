import { isPassed } from './scoring.ts';

export interface CurriculumExercise { id: string; position: number; is_published: boolean; created_at: string }
export interface CurriculumTopic { id: string; position: number; is_published: boolean; exercises: CurriculumExercise[] }
export interface CurriculumLevel { id: string; position: number; is_published: boolean; topics: CurriculumTopic[] }
/** completedAt = the first time the learner reached the pass threshold. */
export interface ProgressEntry { bestStars: number; completedAt: string | null }

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** Flattens published levels → topics → exercises into learning order. */
export function buildSequence<E extends CurriculumExercise>(
  levels: Array<{ position: number; is_published: boolean; topics: Array<{ position: number; is_published: boolean; exercises: E[] }> }>,
): E[] {
  const out: E[] = [];
  for (const level of [...levels].filter((l) => l.is_published).sort(byPosition)) {
    for (const topic of [...level.topics].filter((t) => t.is_published).sort(byPosition)) {
      out.push(...[...topic.exercises].filter((e) => e.is_published).sort(byPosition));
    }
  }
  return out;
}

/**
 * An exercise is open when the gate before it is open, or when the learner already has
 * progress on it or anything after it (so admin edits never re-lock reached content).
 * An exercise created after the learner passed its predecessor does not close the gate.
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
    } else if (gate && lastPassedAt !== null && Date.parse(e.created_at) > Date.parse(lastPassedAt)) {
      gate = true;
    } else {
      gate = false;
    }
  });
  return open;
}
