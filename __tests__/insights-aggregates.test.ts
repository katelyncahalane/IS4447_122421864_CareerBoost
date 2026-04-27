// unit tests – insights buckets from stored ISO dates only (rubric §4)

// imports
import {
  aggregateApplicationsByPeriod,
  aggregateMeanMetricByBuckets,
  maxBucketCount,
  peakBucket,
  windowMomentum,
} from '@/lib/insights-aggregates';

// fixed “today” so counts are stable in CI
const FIXED_NOW = new Date(2026, 3, 26);

// tests
describe('aggregateApplicationsByPeriod', () => {
  it('counts matching days in daily window', () => {
    const dates = ['2026-04-26', '2026-04-26', '2026-04-25'];
    const buckets = aggregateApplicationsByPeriod(dates, 'day', FIXED_NOW);
    const apr26 = buckets.find((b) => b.sortKey === '2026-04-26');
    const apr25 = buckets.find((b) => b.sortKey === '2026-04-25');
    expect(apr26?.count).toBe(2);
    expect(apr25?.count).toBe(1);
    expect(buckets.length).toBe(14);
  });

  it('buckets weeks by Monday start', () => {
    const dates = ['2026-04-22', '2026-04-23'];
    const buckets = aggregateApplicationsByPeriod(dates, 'week', FIXED_NOW);
    const withCount = buckets.filter((b) => b.count > 0);
    expect(withCount.length).toBeGreaterThanOrEqual(1);
    expect(maxBucketCount(buckets)).toBeGreaterThanOrEqual(2);
  });

  it('buckets months', () => {
    const dates = ['2026-02-11', '2026-03-18', '2026-04-05'];
    const buckets = aggregateApplicationsByPeriod(dates, 'month', FIXED_NOW);
    expect(buckets.some((b) => b.sortKey === '2026-04' && b.count >= 1)).toBe(true);
    expect(buckets.some((b) => b.sortKey === '2026-02' && b.count >= 1)).toBe(true);
    expect(buckets.length).toBe(12);
  });
});

describe('peakBucket', () => {
  it('returns the busiest bucket (later sortKey wins ties)', () => {
    const buckets = [
      { label: 'a', sortKey: '2026-04-01', count: 2 },
      { label: 'b', sortKey: '2026-04-08', count: 3 },
      { label: 'c', sortKey: '2026-04-15', count: 3 },
    ];
    const p = peakBucket(buckets);
    expect(p?.count).toBe(3);
    expect(p?.sortKey).toBe('2026-04-15');
  });
});

describe('windowMomentum', () => {
  it('sums first and second halves of the bucket list', () => {
    const buckets = [0, 1, 2, 3].map((i) => ({
      label: String(i),
      sortKey: `k${i}`,
      count: i + 1,
    }));
    const m = windowMomentum(buckets);
    expect(m?.firstTotal).toBe(1 + 2);
    expect(m?.secondTotal).toBe(3 + 4);
  });
});

describe('aggregateMeanMetricByBuckets', () => {
  it('averages metric values within the same daily bucket', () => {
    const rows = [
      { appliedDate: '2026-04-26', metricValue: 10 },
      { appliedDate: '2026-04-26', metricValue: 20 },
    ];
    const out = aggregateMeanMetricByBuckets(rows, 'day', FIXED_NOW);
    const b = out.find((x) => x.sortKey === '2026-04-26');
    expect(b?.mean).toBe(15);
    expect(b?.count).toBe(2);
  });
});
