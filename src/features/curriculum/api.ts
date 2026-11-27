import { useQuery } from '@tanstack/react-query';
import type { ExerciseType } from '@shared/types.ts';
import { supabase, unwrap } from '@/lib/supabase';
import type { ProgressRow } from '@/lib/db';
import { deriveCurriculumState, type CurriculumLevelFull, type CurriculumState } from './curriculumState';

export const TYPE_LABEL: Record<ExerciseType, string> = {
  paragraph: 'Viết đoạn',
  translate_vi_en: 'Dịch V→A',
  translate_en_vi: 'Dịch A→V',
};
export const TYPE_TONE: Record<ExerciseType, 'indigo' | 'green' | 'yellow'> = {
  paragraph: 'indigo',
  translate_vi_en: 'green',
  translate_en_vi: 'yellow',
};

const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export async function fetchCurriculum(): Promise<CurriculumLevelFull[]> {
  const levels = unwrap(
    await supabase
      .from('levels')
      .select('*, topics(*, exercises(id, position, type, title, is_published, created_at, published_at))')
      .order('position'),
  ) as CurriculumLevelFull[];
  // Learners only see published rows (RLS); also hide children of unpublished parents for admins.
  return levels
    .filter((l) => l.is_published)
    .map((l) => ({
      ...l,
      topics: l.topics
        .filter((t) => t.is_published)
        .sort(byPos)
        .map((t) => ({ ...t, exercises: t.exercises.filter((e) => e.is_published).sort(byPos) })),
    }));
}

export async function fetchMyProgress(): Promise<ProgressRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  return unwrap(await supabase.from('user_progress').select('*').eq('user_id', auth.user.id)) as ProgressRow[];
}

export interface CurriculumData extends CurriculumState {
  levels: CurriculumLevelFull[];
  progress: Map<string, ProgressRow>;
}

export function useCurriculum() {
  const levels = useQuery({ queryKey: ['curriculum'], queryFn: fetchCurriculum });
  const progress = useQuery({ queryKey: ['progress'], queryFn: fetchMyProgress });
  const data: CurriculumData | undefined =
    levels.data && progress.data
      ? {
          levels: levels.data,
          progress: new Map(progress.data.map((p) => [p.exercise_id, p])),
          ...deriveCurriculumState(levels.data, progress.data),
        }
      : undefined;
  return {
    data,
    isLoading: levels.isLoading || progress.isLoading,
    error: levels.error ?? progress.error,
    isFetching: levels.isFetching || progress.isFetching,
    refetch: () => Promise.all([levels.refetch(), progress.refetch()]),
  };
}

/** Finds an exercise plus its topic and level inside the loaded curriculum. */
export function locateExercise(levels: CurriculumLevelFull[], exerciseId: string) {
  for (const level of levels) {
    for (const topic of level.topics) {
      const index = topic.exercises.findIndex((e) => e.id === exerciseId);
      if (index >= 0) return { level, topic, exercise: topic.exercises[index], index };
    }
  }
  return null;
}
