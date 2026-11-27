import type { GradeResult } from '@shared/types.ts';
import { countErrorTypes } from './stats';

const res = (...types: Array<GradeResult['errors'][number]['type']>): GradeResult => ({
  overall_score: 7, criteria: [], corrected_text: '', general_feedback_vi: '', model_answer: '',
  errors: types.map((type) => ({ original: 'a', correction: 'b', type, explanation_vi: '' })),
});

test('countErrorTypes sorts descending', () => {
  expect(countErrorTypes([res('grammar', 'spelling'), res('grammar'), res('vocabulary', 'grammar', 'spelling')])).toEqual([
    { type: 'grammar', count: 3 },
    { type: 'spelling', count: 2 },
    { type: 'vocabulary', count: 1 },
  ]);
});

test('countErrorTypes tolerates malformed results', () => {
  expect(countErrorTypes([{} as GradeResult])).toEqual([]);
});
