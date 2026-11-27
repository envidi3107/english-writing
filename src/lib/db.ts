import type { ExerciseType, GradeResult, Hints, Stars } from '@shared/types.ts';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  role: 'learner' | 'admin';
  xp: number;
  streak_count: number;
  last_active_date: string | null;
  created_at: string;
}

export interface LevelRow {
  id: string;
  position: number;
  title: string;
  description: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface TopicRow {
  id: string;
  level_id: string;
  position: number;
  title: string;
  description: string | null;
  icon: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface ExerciseRow {
  id: string;
  topic_id: string;
  position: number;
  type: ExerciseType;
  title: string;
  prompt: string;
  source_text: string | null;
  hints: Hints;
  min_words: number | null;
  max_words: number | null;
  reference_answer: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionRow {
  id: string;
  user_id: string;
  exercise_id: string;
  answer: string;
  result: GradeResult;
  overall_score: number;
  stars: Stars;
  created_at: string;
}

export interface ProgressRow {
  user_id: string;
  exercise_id: string;
  best_score: number;
  best_stars: number;
  attempts: number;
  completed_at: string | null;
  updated_at: string;
}

export interface UsageRow {
  id: string;
  user_id: string;
  kind: 'grade' | 'admin_test';
  model: string;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
  created_at: string;
}

export interface AppSettingsRow {
  id: 1;
  daily_request_budget: number;
  monthly_token_budget: number;
}
