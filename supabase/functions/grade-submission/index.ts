// Supabase Edge Function: grades a learner's answer with Gemini and records the result.
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { ExerciseForGrading, Hints } from '../_shared/types.ts';
import type { CurriculumLevel } from '../_shared/unlock.ts';
import { createGeminiCaller } from './gemini.ts';
import { handleGrade, type GradeDeps, type GradeRequest, type StoredProgress } from './handler.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const fake = Deno.env.get('FAKE_AI') === 'true';
const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
if (fake) {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const local = /127\.0\.0\.1|localhost|kong/.test(url);
  console.warn(`FAKE_AI=true: grades are canned samples, Gemini is NOT called${local ? '' : ' — THIS LOOKS LIKE A HOSTED PROJECT'}`);
}

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const deps: GradeDeps = {
  model,
  async getUserId(jwt) {
    if (!jwt) return null;
    const { data, error } = await db.auth.getUser(jwt);
    return error ? null : (data.user?.id ?? null);
  },
  async isAdmin(userId) {
    const row = must(await db.from('profiles').select('role').eq('id', userId).maybeSingle());
    return row?.role === 'admin';
  },
  async loadExercise(id) {
    const row = must(
      await db
        .from('exercises')
        .select('id, type, title, prompt, source_text, hints, min_words, max_words, reference_answer, is_published, topics!inner(is_published, levels!inner(position, is_published))')
        .eq('id', id)
        .maybeSingle(),
    ) as null | (Omit<ExerciseForGrading, 'level_position'> & {
      id: string; is_published: boolean; hints: Hints;
      topics: { is_published: boolean; levels: { position: number; is_published: boolean } };
    });
    if (!row || !row.is_published || !row.topics.is_published || !row.topics.levels.is_published) return null;
    const { topics, is_published: _p, ...rest } = row;
    return { ...rest, hints: { vocabulary: [], ...rest.hints }, level_position: topics.levels.position };
  },
  async loadCurriculum() {
    return must(
      await db.from('levels').select('id, position, is_published, published_at, topics(id, position, is_published, published_at, exercises(id, position, is_published, created_at, published_at))'),
    ) as CurriculumLevel[];
  },
  async loadProgress(userId) {
    const rows = must(
      await db.from('user_progress').select('exercise_id, best_score, best_stars, attempts, completed_at').eq('user_id', userId),
    ) as Array<{ exercise_id: string; best_score: number; best_stars: number; attempts: number; completed_at: string | null }>;
    return new Map<string, StoredProgress>(
      rows.map((r) => [r.exercise_id, { bestStars: r.best_stars, completedAt: r.completed_at, bestScore: Number(r.best_score), attempts: r.attempts }]),
    );
  },
  callGemini: createGeminiCaller({ apiKey, model, fake }),
  async saveGraded(input) {
    const rows = must(
      await db.rpc('record_grade', {
        p_user: input.userId,
        p_exercise: input.exerciseId,
        p_answer: input.answer,
        p_result: input.result,
        p_score: input.result.overall_score,
        p_stars: input.stars,
        p_now: input.now.toISOString(),
      }),
    ) as Array<{ submission_id: string; xp_gained: number; streak_count: number; newly_passed: boolean }>;
    const r = rows[0];
    return { submissionId: r.submission_id, xpGained: r.xp_gained, streakCount: r.streak_count, newlyPassed: r.newly_passed };
  },
  async logUsage(row) {
    const { error } = await db.from('ai_usage_log').insert({
      user_id: row.userId, kind: row.kind, model: row.model,
      input_tokens: row.inputTokens, output_tokens: row.outputTokens, success: row.success,
    });
    if (error) console.error('usage log failed', error.message);
  },
  now: () => new Date(),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, code: 'not_found', message_vi: 'Phương thức không hỗ trợ.' });
  if (!fake && !apiKey) {
    return json(500, { ok: false, code: 'ai_error', message_vi: 'Máy chủ chưa cấu hình GEMINI_API_KEY.' });
  }

  let body: GradeRequest;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, code: 'invalid_answer', message_vi: 'Dữ liệu gửi lên không hợp lệ.' });
  }
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  try {
    const out = await handleGrade(body, jwt, deps);
    return json(out.status, out.body);
  } catch (err) {
    console.error(err);
    return json(500, { ok: false, code: 'ai_error', message_vi: 'Có lỗi xảy ra khi lưu kết quả. Hãy thử lại.' });
  }
});
