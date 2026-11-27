import { displayStreak, nextStreak, vnDateString } from './streak.ts';

test('vnDateString uses UTC+7', () => {
  expect(vnDateString(new Date('2026-11-27T16:59:59Z'))).toBe('2026-11-27');
  expect(vnDateString(new Date('2026-11-27T17:00:00Z'))).toBe('2026-11-28');
});

test('nextStreak first activity', () => {
  expect(nextStreak({ count: 0, lastActiveDate: null }, new Date('2026-11-27T03:00:00Z')))
    .toEqual({ count: 1, lastActiveDate: '2026-11-27' });
});

test('nextStreak same day unchanged', () => {
  expect(nextStreak({ count: 4, lastActiveDate: '2026-11-27' }, new Date('2026-11-27T10:00:00Z')).count).toBe(4);
});

test('nextStreak consecutive day +1', () => {
  expect(nextStreak({ count: 4, lastActiveDate: '2026-11-26' }, new Date('2026-11-27T01:00:00Z')).count).toBe(5);
});

test('nextStreak across month boundary +1', () => {
  expect(nextStreak({ count: 4, lastActiveDate: '2026-11-30' }, new Date('2026-12-01T01:00:00Z')).count).toBe(5);
});

test('nextStreak gap resets to 1', () => {
  expect(nextStreak({ count: 9, lastActiveDate: '2026-11-24' }, new Date('2026-11-27T01:00:00Z')).count).toBe(1);
});

test('nextStreak at VN midnight boundary', () => {
  // 17:30 UTC on the 27th is 00:30 on the 28th in Vietnam.
  expect(nextStreak({ count: 2, lastActiveDate: '2026-11-27' }, new Date('2026-11-27T17:30:00Z')))
    .toEqual({ count: 3, lastActiveDate: '2026-11-28' });
});

test('displayStreak keeps the streak alive through yesterday', () => {
  const now = new Date('2026-11-27T03:00:00Z');
  expect(displayStreak({ streak_count: 7, last_active_date: '2026-11-27' }, now)).toBe(7);
  expect(displayStreak({ streak_count: 7, last_active_date: '2026-11-26' }, now)).toBe(7);
});

test('displayStreak shows 0 after a missed day', () => {
  expect(displayStreak({ streak_count: 7, last_active_date: '2026-11-24' }, new Date('2026-11-27T03:00:00Z'))).toBe(0);
  expect(displayStreak({ streak_count: 0, last_active_date: null }, new Date('2026-11-27T03:00:00Z'))).toBe(0);
});
