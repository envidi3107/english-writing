import { handleGrade, type GradeDeps } from './handler.ts';
import type { ExerciseForGrading } from '../_shared/types.ts';

const NOW = new Date('2026-11-27T03:00:00Z');
const EX: ExerciseForGrading & { id: string } = {
  id: 'E1', type: 'paragraph', title: 'My family', prompt: 'Viết về gia đình', source_text: null,
  hints: { vocabulary: [] }, min_words: 25, max_words: 40, reference_answer: null, level_position: 1,
};
const curriculum = [{
  id: 'L1', position: 1, is_published: true, topics: [{
    id: 'T1', position: 1, is_published: true, exercises: [
      { id: 'E1', position: 1, is_published: true, created_at: '2026-10-01T00:00:00Z' },
      { id: 'E2', position: 2, is_published: true, created_at: '2026-10-01T00:00:00Z' },
    ],
  }],
}];

const gemini = (overall: number) => ({
  json: {
    status: 'graded', overall_score: overall,
    criteria: [
      { key: 'task', score: overall }, { key: 'grammar', score: overall },
      { key: 'vocabulary', score: overall }, { key: 'coherence', score: overall },
    ],
    corrected_text: 'My family has four people.',
    errors: [{ original: 'have', correction: 'has', type: 'grammar', explanation_vi: 'Số ít.' }],
    general_feedback_vi: 'Tốt!', model_answer: 'My family has four people.',
  },
  inputTokens: 100, outputTokens: 50, model: 'gemini-test',
});

function makeDeps(over: Partial<GradeDeps> = {}): GradeDeps {
  return {
    model: 'gemini-test',
    getUserId: vi.fn(async () => 'U1'),
    isAdmin: vi.fn(async () => false),
    loadExercise: vi.fn(async (id: string) => (id === 'E1' || id === 'E2' ? { ...EX, id } : null)),
    loadCurriculum: vi.fn(async () => curriculum),
    loadProgress: vi.fn(async () => new Map()),
    loadProfile: vi.fn(async () => ({ xp: 40, streak_count: 2, last_active_date: '2026-11-26' })),
    callGemini: vi.fn(async () => gemini(7)),
    saveGraded: vi.fn(async () => ({ submissionId: 'S1' })),
    logUsage: vi.fn(async () => {}),
    now: () => NOW,
    ...over,
  };
}

const req = (answer = 'My family have four people.', exercise_id = 'E1') => ({ exercise_id, answer });

test('returns 401 without user', async () => {
  const deps = makeDeps({ getUserId: vi.fn(async () => null) });
  const res = await handleGrade(req(), null, deps);
  expect(res.status).toBe(401);
  expect(res.body).toMatchObject({ ok: false, code: 'unauthorized' });
});

test('rejects empty answer without calling Gemini', async () => {
  const deps = makeDeps();
  const res = await handleGrade(req('   '), 'jwt', deps);
  expect(res.status).toBe(400);
  expect(res.body).toMatchObject({ ok: false, code: 'invalid_answer', message_vi: 'Bạn chưa viết gì cả.' });
  expect(deps.callGemini).not.toHaveBeenCalled();
});

test('returns not_found for unknown exercise', async () => {
  const res = await handleGrade(req('Hello there', 'NOPE'), 'jwt', makeDeps());
  expect(res.status).toBe(404);
});

test('returns locked for exercise not open', async () => {
  const deps = makeDeps();
  const res = await handleGrade(req('Hello there', 'E2'), 'jwt', deps);
  expect(res.status).toBe(403);
  expect(res.body).toMatchObject({ ok: false, code: 'locked' });
  expect(deps.callGemini).not.toHaveBeenCalled();
});

test('grades, saves and awards xp on first 2-star', async () => {
  const deps = makeDeps();
  const res = await handleGrade(req(), 'jwt', deps);
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ ok: true, kind: 'graded', stars: 2, xp_gained: 20, submission_id: 'S1', streak_count: 3, newly_unlocked: true });
  expect(deps.saveGraded).toHaveBeenCalledWith(expect.objectContaining({
    userId: 'U1', exerciseId: 'E1', answer: 'My family have four people.', stars: 2,
    progress: { best_score: 7, best_stars: 2, attempts: 1, completed_at: NOW.toISOString() },
    profile: { xp: 60, streak_count: 3, last_active_date: '2026-11-27' },
  }));
  expect(deps.logUsage).toHaveBeenCalledWith({ userId: 'U1', kind: 'grade', model: 'gemini-test', inputTokens: 100, outputTokens: 50, success: true });
});

test('retry with lower score keeps best and awards no xp', async () => {
  const deps = makeDeps({
    callGemini: vi.fn(async () => gemini(5.5)),
    loadProgress: vi.fn(async () => new Map([['E1', { bestStars: 3, completedAt: '2026-11-20T00:00:00Z', bestScore: 9, attempts: 2 }]])),
  });
  const res = await handleGrade(req(), 'jwt', deps);
  expect(res.body).toMatchObject({ ok: true, kind: 'graded', stars: 1, xp_gained: 0, newly_unlocked: false });
  expect(deps.saveGraded).toHaveBeenCalledWith(expect.objectContaining({
    progress: { best_score: 9, best_stars: 3, attempts: 3, completed_at: '2026-11-20T00:00:00Z' },
    profile: expect.objectContaining({ xp: 40 }),
  }));
});

test('rejected verdict saves nothing but logs usage', async () => {
  const deps = makeDeps({ callGemini: vi.fn(async () => ({ json: { status: 'rejected', reason_vi: 'Hãy viết bài nhé.' }, inputTokens: 80, outputTokens: 10, model: 'gemini-test' })) });
  const res = await handleGrade(req('asdf qwer'), 'jwt', deps);
  expect(res.body).toEqual({ ok: true, kind: 'rejected', reason_vi: 'Hãy viết bài nhé.' });
  expect(deps.saveGraded).not.toHaveBeenCalled();
  expect(deps.logUsage).toHaveBeenCalledWith(expect.objectContaining({ success: true, inputTokens: 80 }));
});

test('returns ai_error when Gemini JSON is malformed', async () => {
  const deps = makeDeps({ callGemini: vi.fn(async () => ({ json: { status: 'graded' }, inputTokens: 90, outputTokens: 5, model: 'gemini-test' })) });
  const res = await handleGrade(req(), 'jwt', deps);
  expect(res.status).toBe(502);
  expect(res.body).toMatchObject({ ok: false, code: 'ai_error' });
  expect(deps.saveGraded).not.toHaveBeenCalled();
  expect(deps.logUsage).toHaveBeenCalledWith(expect.objectContaining({ success: false, inputTokens: 90 }));
});

test('returns ai_error when Gemini call throws', async () => {
  const deps = makeDeps({ callGemini: vi.fn(async () => { throw new Error('429'); }) });
  const res = await handleGrade(req(), 'jwt', deps);
  expect(res.status).toBe(502);
  expect(deps.logUsage).toHaveBeenCalledWith(expect.objectContaining({ success: false, inputTokens: 0, model: 'gemini-test' }));
});

test('dry_run requires admin', async () => {
  const res = await handleGrade({ dry_run: true, exercise: EX, answer: 'Hello' }, 'jwt', makeDeps());
  expect(res.status).toBe(403);
  expect(res.body).toMatchObject({ ok: false, code: 'forbidden' });
});

test('dry_run for admin grades without saving', async () => {
  const deps = makeDeps({ isAdmin: vi.fn(async () => true) });
  const res = await handleGrade({ dry_run: true, exercise: EX, answer: 'Hello' }, 'jwt', deps);
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ ok: true, kind: 'graded', submission_id: null, xp_gained: 0 });
  expect(deps.saveGraded).not.toHaveBeenCalled();
  expect(deps.logUsage).toHaveBeenCalledWith(expect.objectContaining({ kind: 'admin_test' }));
});
