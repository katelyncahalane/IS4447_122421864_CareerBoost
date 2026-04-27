// unit test – streak helper (advanced feature) from stored ISO dates only

import { computeDailyStreaks } from '@/lib/streak';

describe('computeDailyStreaks', () => {
  const NOW = new Date(2026, 3, 26); // 2026-04-26

  it('returns zero streaks for empty input', () => {
    expect(computeDailyStreaks([], NOW)).toEqual({ current: 0, best: 0 });
  });

  it('counts current streak ending today', () => {
    const dates = ['2026-04-26', '2026-04-25', '2026-04-24', '2026-04-24']; // duplicate day
    expect(computeDailyStreaks(dates, NOW).current).toBe(3);
  });

  it('finds best streak anywhere in history', () => {
    const dates = [
      '2026-04-10',
      '2026-04-11',
      '2026-04-12',
      '2026-03-01',
      '2026-03-02',
    ];
    expect(computeDailyStreaks(dates, NOW).best).toBe(3);
  });

  it('ignores invalid date strings', () => {
    const dates = ['not-a-date', '2026-04-26', '2026-04-25'];
    expect(computeDailyStreaks(dates, NOW)).toEqual({ current: 2, best: 2 });
  });
});

