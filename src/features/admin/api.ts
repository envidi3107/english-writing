import { supabase, unwrap } from '@/lib/supabase';
import type { AppSettingsRow, ExerciseRow, LevelRow, TopicRow } from '@/lib/db';

export type AdminTopic = TopicRow & { exercises: ExerciseRow[] };
export type AdminLevel = LevelRow & { topics: AdminTopic[] };
export type AdminTable = 'levels' | 'topics' | 'exercises';

const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** Whole curriculum including unpublished rows (admins see everything through RLS). */
export async function fetchAdminTree(): Promise<AdminLevel[]> {
  const levels = unwrap(await supabase.from('levels').select('*, topics(*, exercises(*))').order('position')) as AdminLevel[];
  return levels.sort(byPos).map((l) => ({
    ...l,
    topics: l.topics.sort(byPos).map((t) => ({
      ...t,
      exercises: t.exercises.sort(byPos).map((e) => ({ ...e, hints: { ...e.hints, vocabulary: e.hints?.vocabulary ?? [] } })),
    })),
  }));
}

async function upsert<T>(table: AdminTable, row: Partial<T> & { id?: string }): Promise<T> {
  const { id, ...rest } = row as Record<string, unknown>;
  const query = id
    ? supabase.from(table).update(rest).eq('id', id).select('*').single()
    : supabase.from(table).insert(rest).select('*').single();
  return unwrap(await query) as T;
}

export const upsertLevel = (row: Partial<LevelRow>) => upsert<LevelRow>('levels', row);
export const upsertTopic = (row: Partial<TopicRow>) => upsert<TopicRow>('topics', row);
export const upsertExercise = (row: Partial<ExerciseRow>) => {
  const { created_at: _c, updated_at: _u, ...rest } = row;
  return upsert<ExerciseRow>('exercises', rest);
};

const CHILD_LABEL: Record<AdminTable, string> = {
  levels: 'Cấp độ này còn chủ đề bên trong hoặc đã có bài làm của học viên nên không xóa được. Hãy tắt "Xuất bản" để ẩn đi.',
  topics: 'Chủ đề này còn bài tập bên trong hoặc đã có bài làm của học viên nên không xóa được. Hãy tắt "Xuất bản" để ẩn đi.',
  exercises: 'Mục này đã có bài làm của học viên nên không xóa được. Hãy tắt "Xuất bản" để ẩn đi.',
};

export async function deleteRow(
  table: AdminTable,
  id: string,
): Promise<{ ok: true } | { ok: false; restricted: boolean; message_vi: string }> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (!error) return { ok: true };
  if (error.code === '23503') return { ok: false, restricted: true, message_vi: CHILD_LABEL[table] };
  return { ok: false, restricted: false, message_vi: `Không xóa được: ${error.message}` };
}

export async function swapPositions(
  table: AdminTable,
  a: { id: string; position: number },
  b: { id: string; position: number },
): Promise<void> {
  unwrap(await supabase.from(table).update({ position: b.position }).eq('id', a.id).select('id'));
  unwrap(await supabase.from(table).update({ position: a.position }).eq('id', b.id).select('id'));
}

export async function fetchSettings(): Promise<AppSettingsRow> {
  return unwrap(await supabase.from('app_settings').select('*').eq('id', 1).single()) as AppSettingsRow;
}

export async function updateSettings(s: Pick<AppSettingsRow, 'daily_request_budget' | 'monthly_token_budget'>): Promise<void> {
  unwrap(await supabase.from('app_settings').update(s).eq('id', 1).select('id'));
}
