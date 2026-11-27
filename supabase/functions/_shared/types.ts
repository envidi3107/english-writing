export type ExerciseType = 'paragraph' | 'translate_vi_en' | 'translate_en_vi';
export type ErrorType = 'grammar' | 'vocabulary' | 'spelling' | 'punctuation' | 'word_order' | 'meaning';
export type Stars = 0 | 1 | 2 | 3;

export interface Hints {
  vocabulary: string[];
  starter?: string;
}

export interface Criterion {
  key: string;
  label_vi: string;
  score: number;
}

export interface GradeError {
  original: string;
  correction: string;
  type: ErrorType;
  explanation_vi: string;
}

export interface GradeResult {
  overall_score: number;
  criteria: Criterion[];
  corrected_text: string;
  errors: GradeError[];
  general_feedback_vi: string;
  model_answer: string;
}

export type AiVerdict =
  | { kind: 'graded'; result: GradeResult }
  | { kind: 'rejected'; reason_vi: string };

export interface ExerciseForGrading {
  type: ExerciseType;
  title: string;
  prompt: string;
  source_text: string | null;
  hints: Hints;
  min_words: number | null;
  max_words: number | null;
  reference_answer: string | null;
  level_position: number;
}
