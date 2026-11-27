import { deriveCurriculumState, type CurriculumLevelFull } from './curriculumState';
import type { ProgressRow } from '@/lib/db';

const ex = (id: string, position: number) => ({
  id, position, type: 'paragraph' as const, title: id, is_published: true, created_at: '2026-10-01T00:00:00Z', published_at: null,
});
const topic = (id: string, position: number, exercises: ReturnType<typeof ex>[]) => ({
  id, level_id: 'L', position, title: id, description: null, icon: null, is_published: true, published_at: null, created_at: '', exercises,
});
const levels: CurriculumLevelFull[] = [
  { id: 'L1', position: 1, title: 'L1', description: null, is_published: true, published_at: null, created_at: '', topics: [
    topic('T1', 1, [ex('A', 1), ex('B', 2)]),
    topic('T2', 2, [ex('C', 1)]),
  ] },
  { id: 'L2', position: 2, title: 'L2', description: null, is_published: true, published_at: null, created_at: '', topics: [
    topic('T3', 1, [ex('D', 1)]),
  ] },
];
const row = (exercise_id: string, best_stars: number): ProgressRow => ({
  user_id: 'U', exercise_id, best_score: best_stars * 3, best_stars, attempts: 1,
  completed_at: best_stars >= 2 ? '2026-11-01T00:00:00Z' : null, updated_at: '',
});

test('topicStatus counts passed exercises', () => {
  const s = deriveCurriculumState(levels, [row('A', 3), row('B', 1)]);
  expect(s.topicStatus.get('T1')).toEqual({ done: 1, total: 2, stars: 4, open: true });
  expect(s.topicStatus.get('T2')).toEqual({ done: 0, total: 1, stars: 0, open: false });
});

test('nextExerciseId is first open unpassed', () => {
  expect(deriveCurriculumState(levels, []).nextExerciseId).toBe('A');
  expect(deriveCurriculumState(levels, [row('A', 2)]).nextExerciseId).toBe('B');
  expect(deriveCurriculumState(levels, [row('A', 2), row('B', 2), row('C', 2), row('D', 3)]).nextExerciseId).toBeNull();
});

test('level is open when any of its exercises is open', () => {
  const s = deriveCurriculumState(levels, [row('A', 2), row('B', 2)]);
  expect(s.levelOpen.get('L1')).toBe(true);
  expect(s.levelOpen.get('L2')).toBe(false);
  expect(s.open.has('C')).toBe(true);
});
