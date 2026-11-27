import { buildSequence, computeOpenExercises, type CurriculumExercise, type CurriculumLevel, type ProgressEntry } from './unlock.ts';

const ex = (id: string, created_at = '2026-10-01T00:00:00Z', position = 1): CurriculumExercise =>
  ({ id, position, is_published: true, created_at });
const seq = [ex('A'), ex('B'), ex('C')];
const prog = (entries: Record<string, ProgressEntry>) => new Map(Object.entries(entries));

test('first exercise is open for new learner', () => {
  expect([...computeOpenExercises(seq, new Map())]).toEqual(['A']);
});

test('passing A opens B only', () => {
  const open = computeOpenExercises(seq, prog({ A: { bestStars: 2, completedAt: '2026-11-01T00:00:00Z' } }));
  expect([...open].sort()).toEqual(['A', 'B']);
});

test('1 star does not open next', () => {
  const open = computeOpenExercises(seq, prog({ A: { bestStars: 1, completedAt: null } }));
  expect([...open]).toEqual(['A']);
});

test('never relocks: progress later keeps everything before open', () => {
  const open = computeOpenExercises(seq, prog({ C: { bestStars: 1, completedAt: null } }));
  expect([...open].sort()).toEqual(['A', 'B', 'C']);
});

test('exercise added after learner passed previous does not gate', () => {
  const s = [ex('A'), ex('X', '2026-11-10T00:00:00Z'), ex('B')];
  const open = computeOpenExercises(s, prog({ A: { bestStars: 3, completedAt: '2026-11-01T00:00:00Z' } }));
  expect(open.has('A') && open.has('X') && open.has('B')).toBe(true);
  expect(open.size).toBe(3);
});

test('exercise that existed before does gate', () => {
  const s = [ex('A'), ex('X', '2026-10-01T00:00:00Z'), ex('B')];
  const open = computeOpenExercises(s, prog({ A: { bestStars: 3, completedAt: '2026-11-01T00:00:00Z' } }));
  expect([...open].sort()).toEqual(['A', 'X']);
});

test('old draft published after learner passed previous does not gate', () => {
  const s = [ex('A'), { ...ex('X', '2026-10-01T00:00:00Z'), visible_since: '2026-11-10T00:00:00Z' }, ex('B')];
  const open = computeOpenExercises(s, prog({ A: { bestStars: 3, completedAt: '2026-11-01T00:00:00Z' } }));
  expect([...open].sort()).toEqual(['A', 'B', 'X']);
});

test('buildSequence derives visible_since from the latest published_at of exercise, topic and level', () => {
  const levels: CurriculumLevel[] = [
    { id: 'L1', position: 1, is_published: true, published_at: '2026-10-01T00:00:00Z', topics: [
      { id: 'T1', position: 1, is_published: true, published_at: '2026-11-20T00:00:00Z', exercises: [
        { ...ex('E1'), published_at: '2026-10-05T00:00:00Z' },
      ] },
    ] },
  ];
  expect(buildSequence(levels)[0].visible_since).toBe('2026-11-20T00:00:00Z');
});

test('buildSequence skips unpublished and orders by position', () => {
  const levels: CurriculumLevel[] = [
    { id: 'L2', position: 2, is_published: true, topics: [
      { id: 'T3', position: 1, is_published: true, exercises: [ex('E5', undefined, 1)] },
    ] },
    { id: 'L1', position: 1, is_published: true, topics: [
      { id: 'T2', position: 2, is_published: true, exercises: [ex('E4', undefined, 1)] },
      { id: 'T1', position: 1, is_published: true, exercises: [ex('E2', undefined, 2), ex('E1', undefined, 1), { ...ex('E3', undefined, 3), is_published: false }] },
      { id: 'Tx', position: 3, is_published: false, exercises: [ex('E9', undefined, 1)] },
    ] },
    { id: 'L3', position: 3, is_published: false, topics: [
      { id: 'T9', position: 1, is_published: true, exercises: [ex('E10', undefined, 1)] },
    ] },
  ];
  expect(buildSequence(levels).map((e) => e.id)).toEqual(['E1', 'E2', 'E4', 'E5']);
});
