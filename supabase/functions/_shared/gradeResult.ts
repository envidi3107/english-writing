import { criteriaFor } from './prompt.ts';
import type { AiVerdict, ErrorType, ExerciseType, GradeError } from './types.ts';

const ERROR_TYPES: ErrorType[] = ['grammar', 'vocabulary', 'spelling', 'punctuation', 'word_order', 'meaning'];

/** responseSchema for Gemini structured output (OpenAPI subset). */
export const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    status: { type: 'STRING', enum: ['graded', 'rejected'] },
    reason_vi: { type: 'STRING' },
    overall_score: { type: 'NUMBER' },
    criteria: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { key: { type: 'STRING' }, label_vi: { type: 'STRING' }, score: { type: 'NUMBER' } },
        required: ['key', 'score'],
      },
    },
    corrected_text: { type: 'STRING' },
    errors: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          original: { type: 'STRING' },
          correction: { type: 'STRING' },
          type: { type: 'STRING', enum: ERROR_TYPES },
          explanation_vi: { type: 'STRING' },
        },
        required: ['original', 'correction', 'type', 'explanation_vi'],
      },
    },
    general_feedback_vi: { type: 'STRING' },
    model_answer: { type: 'STRING' },
  },
  required: ['status'],
  propertyOrdering: [
    'status',
    'reason_vi',
    'overall_score',
    'criteria',
    'corrected_text',
    'errors',
    'general_feedback_vi',
    'model_answer',
  ],
};

export class GradeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GradeParseError';
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const score = (v: unknown, field: string): number => {
  if (typeof v !== 'number' || Number.isNaN(v)) throw new GradeParseError(`${field} is not a number`);
  return Math.round(Math.min(10, Math.max(0, v)) * 10) / 10;
};

const str = (v: unknown, field: string): string => {
  if (typeof v !== 'string') throw new GradeParseError(`${field} is not a string`);
  return v;
};

export function parseAiVerdict(raw: unknown, type: ExerciseType): AiVerdict {
  if (!isObj(raw)) throw new GradeParseError('response is not an object');
  if (raw.status === 'rejected') return { kind: 'rejected', reason_vi: str(raw.reason_vi, 'reason_vi') };
  if (raw.status !== undefined && raw.status !== 'graded') throw new GradeParseError('unknown status');

  if (!Array.isArray(raw.criteria)) throw new GradeParseError('criteria missing');
  const given = new Map<string, number>();
  for (const c of raw.criteria) {
    if (isObj(c) && typeof c.key === 'string') given.set(c.key, score(c.score, `criteria.${c.key}`));
  }
  const criteria = criteriaFor(type).map((c) => {
    const s = given.get(c.key);
    if (s === undefined) throw new GradeParseError(`criterion ${c.key} missing`);
    return { ...c, score: s };
  });

  if (!Array.isArray(raw.errors)) throw new GradeParseError('errors missing');
  const errors: GradeError[] = raw.errors.filter(isObj).map((e, i) => ({
    original: str(e.original, `errors[${i}].original`),
    correction: str(e.correction, `errors[${i}].correction`),
    type: ERROR_TYPES.includes(e.type as ErrorType) ? (e.type as ErrorType) : 'grammar',
    explanation_vi: str(e.explanation_vi, `errors[${i}].explanation_vi`),
  }));

  return {
    kind: 'graded',
    result: {
      overall_score: score(raw.overall_score, 'overall_score'),
      criteria,
      corrected_text: str(raw.corrected_text, 'corrected_text'),
      errors,
      general_feedback_vi: str(raw.general_feedback_vi, 'general_feedback_vi'),
      model_answer: str(raw.model_answer, 'model_answer'),
    },
  };
}
