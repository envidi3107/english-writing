import { useQuery } from '@tanstack/react-query';
import { summarizeDaily, type UsageSummary } from '@shared/usage.ts';
import type { ExerciseType, GradeResult, Stars } from '@shared/types.ts';
import { supabase, unwrap } from '@/lib/supabase';
import type { AppSettingsRow } from '@/lib/db';

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async (): Promise<UsageSummary & { budget: AppSettingsRow }> => {
      const [rows, settings] = await Promise.all([
        supabase.rpc('my_usage_daily', { p_days: 32 }),
        supabase.from('app_settings').select('*').eq('id', 1).maybeSingle(),
      ]);
      const daily = ((unwrap(rows) as Array<{ day: string; requests: number; tokens: number }> | null) ?? []).map((r) => ({
        date: r.day,
        requests: Number(r.requests),
        tokens: Number(r.tokens),
      }));
      const budget = (unwrap(settings) as AppSettingsRow | null) ?? { id: 1, daily_request_budget: 250, monthly_token_budget: 10_000_000 };
      return { ...summarizeDaily(daily, new Date()), budget };
    },
    refetchInterval: 60_000,
  });
}

export interface SubmissionListItem {
  id: string;
  created_at: string;
  stars: Stars;
  overall_score: number;
  exercise_id: string;
  exercise: { title: string; type: ExerciseType; topic: { id: string; title: string; icon: string | null } | null } | null;
}

export function useMySubmissions() {
  return useQuery({
    queryKey: ['submissions'],
    queryFn: async (): Promise<SubmissionListItem[]> => {
      const uid = await currentUserId();
      if (!uid) return [];
      const rows = unwrap(
        await supabase
          .from('submissions')
          .select('id, created_at, stars, overall_score, exercise_id, exercise:exercises(title, type, topic:topics(id, title, icon))')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(500),
      ) as unknown as SubmissionListItem[];
      return rows.map((r) => ({ ...r, overall_score: Number(r.overall_score) }));
    },
  });
}

export function useMyErrorResults() {
  return useQuery({
    queryKey: ['submissions', 'results'],
    queryFn: async (): Promise<GradeResult[]> => {
      const uid = await currentUserId();
      if (!uid) return [];
      const rows = unwrap(
        await supabase.from('submissions').select('result').eq('user_id', uid).order('created_at', { ascending: false }).limit(200),
      ) as { result: GradeResult }[];
      return rows.map((r) => r.result);
    },
  });
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: ['submission', id],
    queryFn: async () => {
      const row = unwrap(
        await supabase
          .from('submissions')
          .select('id, created_at, answer, result, stars, overall_score, exercise_id, exercise:exercises(title, type, topic_id)')
          .eq('id', id)
          .maybeSingle(),
      ) as null | {
        id: string; created_at: string; answer: string; result: GradeResult; stars: Stars; overall_score: number; exercise_id: string;
        exercise: { title: string; type: ExerciseType; topic_id: string } | null;
      };
      if (!row) throw new Error('Không tìm thấy bài đã nộp.');
      return row;
    },
  });
}

export async function updateDisplayName(userId: string, name: string): Promise<void> {
  unwrap(await supabase.from('profiles').update({ display_name: name.trim() || null }).eq('id', userId).select('id'));
}

export const formatTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}M` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n);

export const formatDateTimeVi = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
