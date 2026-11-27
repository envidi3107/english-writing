import { parseAiVerdict } from '../_shared/gradeResult.ts';
import { buildGradingPrompt } from '../_shared/prompt.ts';
import { isPassed, starsFromScore, xpGain } from '../_shared/scoring.ts';
import { nextStreak } from '../_shared/streak.ts';
import { validateAnswer } from '../_shared/text.ts';
import type { AiVerdict, ExerciseForGrading, GradeResult, Stars } from '../_shared/types.ts';
import { buildSequence, computeOpenExercises, type CurriculumLevel, type ProgressEntry } from '../_shared/unlock.ts';

export type GradeRequest =
  | { exercise_id: string; answer: string }
  | { dry_run: true; exercise: ExerciseForGrading; answer: string };

export type GradeErrorCode = 'unauthorized' | 'forbidden' | 'not_found' | 'locked' | 'invalid_answer' | 'ai_error';

export type GradeResponse =
  | {
      ok: true;
      kind: 'graded';
      result: GradeResult;
      stars: Stars;
      xp_gained: number;
      submission_id: string | null;
      streak_count: number;
      newly_unlocked: boolean;
    }
  | { ok: true; kind: 'rejected'; reason_vi: string }
  | { ok: false; code: GradeErrorCode | 'network'; message_vi: string };

export interface GeminiCall {
  json: unknown;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export type StoredProgress = ProgressEntry & { bestScore: number; attempts: number };

export interface GradeDeps {
  /** Configured model name, used for usage logs when the call itself fails. */
  model: string;
  getUserId(jwt: string | null): Promise<string | null>;
  isAdmin(userId: string): Promise<boolean>;
  /** Only exercises that are published together with their topic and level. */
  loadExercise(id: string): Promise<(ExerciseForGrading & { id: string }) | null>;
  loadCurriculum(): Promise<CurriculumLevel[]>;
  loadProgress(userId: string): Promise<Map<string, StoredProgress>>;
  loadProfile(userId: string): Promise<{ xp: number; streak_count: number; last_active_date: string | null }>;
  callGemini(prompt: { system: string; user: string }): Promise<GeminiCall>;
  saveGraded(input: {
    userId: string;
    exerciseId: string;
    answer: string;
    result: GradeResult;
    stars: Stars;
    progress: { best_score: number; best_stars: number; attempts: number; completed_at: string | null };
    profile: { xp: number; streak_count: number; last_active_date: string };
  }): Promise<{ submissionId: string }>;
  logUsage(row: {
    userId: string;
    kind: 'grade' | 'admin_test';
    model: string;
    inputTokens: number;
    outputTokens: number;
    success: boolean;
  }): Promise<void>;
  now(): Date;
}

type Out = { status: number; body: GradeResponse };

const fail = (status: number, code: GradeErrorCode, message_vi: string): Out => ({
  status,
  body: { ok: false, code, message_vi },
});

const AI_ERROR_VI = 'AI đang bận hoặc gặp lỗi. Bài của bạn vẫn còn, hãy thử lại sau ít phút.';

async function runAi(
  exercise: ExerciseForGrading,
  answer: string,
  userId: string,
  kind: 'grade' | 'admin_test',
  deps: GradeDeps,
): Promise<AiVerdict | null> {
  let call: GeminiCall | null = null;
  try {
    call = await deps.callGemini(buildGradingPrompt(exercise, answer));
    const verdict = parseAiVerdict(call.json, exercise.type);
    await deps.logUsage({
      userId, kind, model: call.model, inputTokens: call.inputTokens, outputTokens: call.outputTokens, success: true,
    });
    return verdict;
  } catch (err) {
    console.error('grading failed', err);
    await deps.logUsage({
      userId,
      kind,
      model: call?.model ?? deps.model,
      inputTokens: call?.inputTokens ?? 0,
      outputTokens: call?.outputTokens ?? 0,
      success: false,
    });
    return null;
  }
}

export async function handleGrade(req: GradeRequest, jwt: string | null, deps: GradeDeps): Promise<Out> {
  const userId = await deps.getUserId(jwt);
  if (!userId) return fail(401, 'unauthorized', 'Bạn cần đăng nhập lại.');

  const checked = validateAnswer(typeof req.answer === 'string' ? req.answer : '');
  if (!checked.ok) return fail(400, 'invalid_answer', checked.message_vi);
  const answer = checked.text;

  if ('dry_run' in req && req.dry_run) {
    if (!(await deps.isAdmin(userId))) return fail(403, 'forbidden', 'Chỉ quản trị viên mới được thử chấm.');
    const verdict = await runAi(req.exercise, answer, userId, 'admin_test', deps);
    if (!verdict) return fail(502, 'ai_error', AI_ERROR_VI);
    if (verdict.kind === 'rejected') return { status: 200, body: { ok: true, ...verdict } };
    return {
      status: 200,
      body: {
        ok: true, kind: 'graded', result: verdict.result, stars: starsFromScore(verdict.result.overall_score),
        xp_gained: 0, submission_id: null, streak_count: 0, newly_unlocked: false,
      },
    };
  }

  const exerciseId = (req as { exercise_id: string }).exercise_id;
  const exercise = await deps.loadExercise(exerciseId);
  if (!exercise) return fail(404, 'not_found', 'Không tìm thấy bài tập.');

  const [levels, progress] = await Promise.all([deps.loadCurriculum(), deps.loadProgress(userId)]);
  if (!computeOpenExercises(buildSequence(levels), progress).has(exerciseId)) {
    return fail(403, 'locked', 'Bài này chưa được mở khóa.');
  }

  const verdict = await runAi(exercise, answer, userId, 'grade', deps);
  if (!verdict) return fail(502, 'ai_error', AI_ERROR_VI);
  if (verdict.kind === 'rejected') return { status: 200, body: { ok: true, ...verdict } };

  const now = deps.now();
  const result = verdict.result;
  const stars = starsFromScore(result.overall_score);
  const prev = progress.get(exerciseId);
  const gained = xpGain(prev?.bestStars ?? 0, stars);
  const newlyPassed = !prev?.completedAt && isPassed(stars);

  const profile = await deps.loadProfile(userId);
  const streak = nextStreak({ count: profile.streak_count, lastActiveDate: profile.last_active_date }, now);

  const { submissionId } = await deps.saveGraded({
    userId,
    exerciseId,
    answer,
    result,
    stars,
    progress: {
      best_score: Math.max(prev?.bestScore ?? 0, result.overall_score),
      best_stars: Math.max(prev?.bestStars ?? 0, stars),
      attempts: (prev?.attempts ?? 0) + 1,
      completed_at: prev?.completedAt ?? (newlyPassed ? now.toISOString() : null),
    },
    profile: { xp: profile.xp + gained, streak_count: streak.count, last_active_date: streak.lastActiveDate },
  });

  return {
    status: 200,
    body: {
      ok: true, kind: 'graded', result, stars, xp_gained: gained, submission_id: submissionId,
      streak_count: streak.count, newly_unlocked: newlyPassed,
    },
  };
}
