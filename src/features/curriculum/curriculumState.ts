import { isPassed } from '@shared/scoring.ts';
import { buildSequence, computeOpenExercises, type ProgressEntry } from '@shared/unlock.ts';
import type { ExerciseRow, LevelRow, ProgressRow, TopicRow } from '@/lib/db';

export type ExerciseSummary = Pick<ExerciseRow, 'id' | 'position' | 'type' | 'title' | 'is_published' | 'created_at' | 'published_at'>;
export type TopicWithExercises = TopicRow & { exercises: ExerciseSummary[] };
export type CurriculumLevelFull = LevelRow & { topics: TopicWithExercises[] };

export type TopicStatus = { done: number; total: number; stars: number; open: boolean };

export interface CurriculumState {
  open: Set<string>;
  topicStatus: Map<string, TopicStatus>;
  levelOpen: Map<string, boolean>;
  nextExerciseId: string | null;
}

export function deriveCurriculumState(levels: CurriculumLevelFull[], progress: ProgressRow[]): CurriculumState {
  const byId = new Map(progress.map((p) => [p.exercise_id, p]));
  const entries = new Map<string, ProgressEntry>(
    progress.map((p) => [p.exercise_id, { bestStars: p.best_stars, completedAt: p.completed_at }]),
  );
  const seq = buildSequence(levels);
  const open = computeOpenExercises(seq, entries);

  const topicStatus = new Map<string, TopicStatus>();
  const levelOpen = new Map<string, boolean>();
  for (const level of levels) {
    let anyOpen = false;
    for (const topic of level.topics) {
      const exercises = topic.exercises.filter((e) => e.is_published);
      const status: TopicStatus = { done: 0, total: exercises.length, stars: 0, open: false };
      for (const e of exercises) {
        const p = byId.get(e.id);
        if (p && isPassed(p.best_stars)) status.done += 1;
        status.stars += p?.best_stars ?? 0;
        if (open.has(e.id)) status.open = true;
      }
      topicStatus.set(topic.id, status);
      anyOpen ||= status.open;
    }
    levelOpen.set(level.id, anyOpen);
  }

  const next = seq.find((e) => open.has(e.id) && !isPassed(byId.get(e.id)?.best_stars ?? 0));
  return { open, topicStatus, levelOpen, nextExerciseId: next?.id ?? null };
}
