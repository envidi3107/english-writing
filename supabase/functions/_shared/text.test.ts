import { countWords, MAX_ANSWER_CHARS, validateAnswer } from './text.ts';

test('countWords counts plain words', () => {
  expect(countWords('My father works in a bank.')).toBe(6);
});

test('countWords ignores standalone punctuation', () => {
  expect(countWords("I don't like it , really !")).toBe(5);
});

test('countWords of whitespace is 0', () => {
  expect(countWords('  ')).toBe(0);
});

test('countWords handles Vietnamese in NFD form', () => {
  expect(countWords('Tôi yêu gia đình'.normalize('NFD'))).toBe(4);
});

test('validateAnswer rejects whitespace', () => {
  expect(validateAnswer('   ')).toEqual({ ok: false, message_vi: 'Bạn chưa viết gì cả.' });
});

test('validateAnswer rejects over-long answers', () => {
  expect(validateAnswer('a'.repeat(MAX_ANSWER_CHARS + 1))).toEqual({ ok: false, message_vi: 'Bài viết quá dài (tối đa 1500 ký tự).' });
});

test('validateAnswer trims and accepts', () => {
  expect(validateAnswer(' Hi there ')).toEqual({ ok: true, text: 'Hi there' });
});
