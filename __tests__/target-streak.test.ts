import type { ApplicationForTarget, TargetForProgress } from '@/lib/target-progress';
import {
  computeMonthlyTargetStreak,
  computeWeeklyTargetStreak,
  currentMonthStartIso,
  currentWeekStartIso,
  monthTargetsMetStatus,
  weekTargetsMetStatus,
} from '@/lib/target-streak';

describe('currentWeekStartIso / currentMonthStartIso', () => {
  const now = new Date(2026, 3, 8);
  it('anchors Monday for a Wednesday in April 2026', () => {
    expect(currentWeekStartIso(now)).toBe('2026-04-06');
  });
  it('anchors first of month', () => {
    expect(currentMonthStartIso(now)).toBe('2026-04-01');
  });
});

describe('weekTargetsMetStatus', () => {
  const apps: ApplicationForTarget[] = [
    { appliedDate: '2026-04-07', categoryId: 1 },
    { appliedDate: '2026-04-08', categoryId: 1 },
  ];
  const targets: TargetForProgress[] = [
    {
      scope: 'global',
      categoryId: null,
      periodType: 'week',
      periodStart: '2026-04-06',
      goalCount: 2,
    },
  ];

  it('returns null when no weekly targets for anchor', () => {
    expect(weekTargetsMetStatus(apps, targets, '2026-03-30')).toBeNull();
  });

  it('returns true when counts meet all goals', () => {
    expect(weekTargetsMetStatus(apps, targets, '2026-04-06')).toBe(true);
  });

  it('returns false when under goal', () => {
    expect(weekTargetsMetStatus([], targets, '2026-04-06')).toBe(false);
  });
});

describe('computeWeeklyTargetStreak', () => {
  it('counts consecutive met weeks ending this week', () => {
    const now = new Date(2026, 3, 8);
    const apps: ApplicationForTarget[] = [
      { appliedDate: '2026-04-07', categoryId: 1 },
      { appliedDate: '2026-04-01', categoryId: 1 },
    ];
    const t: TargetForProgress[] = [
      { scope: 'global', categoryId: null, periodType: 'week', periodStart: '2026-04-06', goalCount: 1 },
      { scope: 'global', categoryId: null, periodType: 'week', periodStart: '2026-03-30', goalCount: 1 },
    ];
    const r = computeWeeklyTargetStreak(apps, t, now);
    expect(r.current).toBe(2);
    expect(r.best).toBe(2);
  });
});

describe('monthTargetsMetStatus', () => {
  it('returns null when no monthly targets', () => {
    expect(monthTargetsMetStatus([], [], '2026-04-01')).toBeNull();
  });
});

describe('computeMonthlyTargetStreak', () => {
  it('returns zeros when no monthly targets exist', () => {
    const now = new Date(2026, 3, 15);
    const r = computeMonthlyTargetStreak([], [], now);
    expect(r).toEqual({ current: 0, best: 0 });
  });
});
