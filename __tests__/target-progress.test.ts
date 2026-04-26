// unit tests – period windows and counting rules for targets

// imports
import { countApplicationsForTarget, isApplicationInTargetPeriod } from '@/lib/target-progress';

// tests
describe('target-progress', () => {
  it('counts applications inside a week window (inclusive)', () => {
    const target = {
      scope: 'global',
      categoryId: null,
      periodType: 'week',
      periodStart: '2026-04-21',
      goalCount: 6,
    };
    const apps = [
      { appliedDate: '2026-04-20', categoryId: 1 },
      { appliedDate: '2026-04-21', categoryId: 1 },
      { appliedDate: '2026-04-27', categoryId: 2 },
      { appliedDate: '2026-04-28', categoryId: 1 },
    ];
    expect(countApplicationsForTarget(apps, target)).toBe(2);
  });

  it('filters by category for category-scoped targets', () => {
    const target = {
      scope: 'category',
      categoryId: 1,
      periodType: 'month',
      periodStart: '2026-04-01',
      goalCount: 5,
    };
    const apps = [
      { appliedDate: '2026-04-10', categoryId: 1 },
      { appliedDate: '2026-04-15', categoryId: 2 },
    ];
    expect(countApplicationsForTarget(apps, target)).toBe(1);
  });

  it('isApplicationInTargetPeriod rejects bad dates', () => {
    expect(isApplicationInTargetPeriod('not-a-date', 'week', '2026-04-21')).toBe(false);
  });
});
