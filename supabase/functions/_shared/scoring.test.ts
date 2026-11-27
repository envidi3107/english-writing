import { isPassed, starsFromScore, xpForStars, xpGain } from './scoring.ts';

test.each([
  [10, 3], [8.5, 3], [8.4, 2], [6.5, 2], [6.4, 1], [5, 1], [4.9, 0], [0, 0],
])('starsFromScore(%d) = %d', (score, expected) => {
  expect(starsFromScore(score)).toBe(expected);
});

test('isPassed requires at least 2 stars', () => {
  expect(isPassed(2)).toBe(true);
  expect(isPassed(3)).toBe(true);
  expect(isPassed(1)).toBe(false);
});

test('xpForStars', () => {
  expect([0, 1, 2, 3].map(xpForStars)).toEqual([0, 10, 20, 30]);
});

test('xpGain only counts improvement', () => {
  expect(xpGain(0, 2)).toBe(20);
  expect(xpGain(2, 3)).toBe(10);
  expect(xpGain(3, 1)).toBe(0);
  expect(xpGain(2, 2)).toBe(0);
});
