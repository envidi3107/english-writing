import { diffTokens } from './diffTokens';

test('diffTokens marks replaced and inserted words', () => {
  const tokens = diffTokens('My father work in bank.', 'My father works in a bank.');
  const marked = tokens.filter((t) => t.kind !== 'same').map((t) => ({ kind: t.kind, text: t.text.trim() }));
  expect(marked).toContainEqual({ kind: 'removed', text: 'work' });
  expect(marked).toContainEqual({ kind: 'added', text: 'works' });
  expect(marked).toContainEqual({ kind: 'added', text: 'a' });
});

test('non-removed tokens rebuild the corrected text exactly', () => {
  const corrected = 'My family has four people. We are happy!';
  const tokens = diffTokens('My family have four people. We is happy !', corrected);
  expect(tokens.filter((t) => t.kind !== 'removed').map((t) => t.text).join('')).toBe(corrected);
});

test('punctuation change does not mark the whole sentence', () => {
  const tokens = diffTokens('I like cats', 'I like cats.');
  expect(tokens.filter((t) => t.kind === 'removed')).toHaveLength(0);
  expect(tokens.filter((t) => t.kind === 'added').map((t) => t.text)).toEqual(['.']);
});

test('diffTokens handles Vietnamese in NFD vs NFC as identical', () => {
  const tokens = diffTokens('Tôi yêu gia đình'.normalize('NFD'), 'Tôi yêu gia đình');
  expect(tokens.every((t) => t.kind === 'same')).toBe(true);
});
