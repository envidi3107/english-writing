import { GradeParseError, parseAiVerdict } from './gradeResult.ts';

const valid = () => ({
  status: 'graded',
  overall_score: 7.26,
  criteria: [
    { key: 'task', label_vi: 'Đúng đề', score: 9 },
    { key: 'grammar', label_vi: 'Ngữ pháp', score: 6 },
    { key: 'vocabulary', label_vi: 'Từ vựng', score: 8 },
    { key: 'coherence', label_vi: 'Mạch lạc', score: 7 },
  ],
  corrected_text: 'My family has four people.',
  errors: [{ original: 'have', correction: 'has', type: 'grammar', explanation_vi: 'Chủ ngữ số ít.' }],
  general_feedback_vi: 'Tốt lắm!',
  model_answer: 'My family has four people.',
});

test('parses a graded verdict in canonical criteria order', () => {
  const raw = valid();
  raw.criteria.reverse();
  const v = parseAiVerdict(raw, 'paragraph');
  expect(v.kind).toBe('graded');
  if (v.kind !== 'graded') return;
  expect(v.result.criteria.map((c) => c.key)).toEqual(['task', 'grammar', 'vocabulary', 'coherence']);
  expect(v.result.overall_score).toBe(7.3);
});

test('clamps scores into 0–10', () => {
  const raw = valid();
  raw.overall_score = 12;
  raw.criteria[0].score = -1;
  const v = parseAiVerdict(raw, 'paragraph');
  if (v.kind !== 'graded') throw new Error('expected graded');
  expect(v.result.overall_score).toBe(10);
  expect(v.result.criteria[0].score).toBe(0);
});

test('parses a rejected verdict', () => {
  expect(parseAiVerdict({ status: 'rejected', reason_vi: 'Hãy viết bài nhé.' }, 'paragraph'))
    .toEqual({ kind: 'rejected', reason_vi: 'Hãy viết bài nhé.' });
});

test('throws when corrected_text is missing', () => {
  const raw: Record<string, unknown> = valid();
  delete raw.corrected_text;
  expect(() => parseAiVerdict(raw, 'paragraph')).toThrow(GradeParseError);
});

test('throws when a criterion is missing', () => {
  const raw = valid();
  raw.criteria.pop();
  expect(() => parseAiVerdict(raw, 'paragraph')).toThrow(GradeParseError);
});

test('unknown error type falls back to grammar', () => {
  const raw = valid();
  raw.errors[0].type = 'style';
  const v = parseAiVerdict(raw, 'paragraph');
  if (v.kind !== 'graded') throw new Error('expected graded');
  expect(v.result.errors[0].type).toBe('grammar');
});

test('throws on non-object input', () => {
  expect(() => parseAiVerdict('nope', 'paragraph')).toThrow(GradeParseError);
});
