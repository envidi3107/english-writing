import { useQuery } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { buildSequence } from '@shared/unlock.ts';
import type { GradeRequest, GradeResponse } from '../../../supabase/functions/grade-submission/handler.ts';
import { supabase, unwrap } from '@/lib/supabase';
import type { ExerciseRow, ProgressRow } from '@/lib/db';
import { locateExercise, useCurriculum } from '@/features/curriculum/api';
import type { TopicWithExercises } from '@/features/curriculum/curriculumState';

export type { GradeRequest, GradeResponse };

export async function fetchExercise(id: string): Promise<ExerciseRow> {
  const row = unwrap(await supabase.from('exercises').select('*').eq('id', id).maybeSingle()) as ExerciseRow | null;
  if (!row) throw new Error('Không tìm thấy bài tập.');
  return { ...row, hints: { ...row.hints, vocabulary: row.hints?.vocabulary ?? [] } };
}

export interface ExerciseContext {
  exercise: ExerciseRow;
  levelPosition: number;
  levelTitle: string;
  topic: Pick<TopicWithExercises, 'id' | 'title' | 'icon'>;
  isOpen: boolean;
  nextExerciseId: string | null;
  best?: ProgressRow;
}

export function useExerciseContext(id: string) {
  const exercise = useQuery({ queryKey: ['exercise', id], queryFn: () => fetchExercise(id) });
  const curriculum = useCurriculum();
  let data: ExerciseContext | undefined;
  if (exercise.data && curriculum.data) {
    const where = locateExercise(curriculum.data.levels, id);
    const seq = buildSequence(curriculum.data.levels);
    const idx = seq.findIndex((e) => e.id === id);
    data = {
      exercise: exercise.data,
      levelPosition: where?.level.position ?? 1,
      levelTitle: where?.level.title ?? '',
      topic: where ? { id: where.topic.id, title: where.topic.title, icon: where.topic.icon } : { id: '', title: '', icon: null },
      isOpen: curriculum.data.open.has(id),
      nextExerciseId: idx >= 0 && idx + 1 < seq.length ? seq[idx + 1].id : null,
      best: curriculum.data.progress.get(id),
    };
  }
  return { data, isLoading: exercise.isLoading || curriculum.isLoading, error: exercise.error ?? curriculum.error };
}

const NETWORK_ERROR: GradeResponse = {
  ok: false,
  code: 'network',
  message_vi: 'Không kết nối được. Kiểm tra mạng và thử lại.',
};

export async function gradeSubmission(req: GradeRequest): Promise<GradeResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<GradeResponse>('grade-submission', { body: req });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        try {
          return (await error.context.json()) as GradeResponse;
        } catch {
          return { ok: false, code: 'ai_error', message_vi: 'Máy chủ chấm bài gặp lỗi. Hãy thử lại.' };
        }
      }
      return NETWORK_ERROR;
    }
    return data ?? NETWORK_ERROR;
  } catch {
    return NETWORK_ERROR;
  }
}
