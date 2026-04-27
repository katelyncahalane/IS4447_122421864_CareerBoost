// Insights helpers — **inputs must come only from SQLite rows** (via Drizzle), e.g. `appliedDate`, `metricValue`,
// `status`, `categoryName` read in the Insights screen. No fabricated counts: aggregations operate on those arrays only.

export type InsightPeriod = 'day' | 'week' | 'month';

export type InsightBucket = { label: string; count: number; sortKey: string };

/** yyyy-mm-dd from local calendar parts */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday-start week key yyyy-mm-dd for the Monday of that week */
function mondayKeyFromIsoDate(iso: string): string | null {
  const t = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [y, mo, d] = t.split('-').map(Number);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return toIsoDate(dt);
}

function monthKeyFromIsoDate(iso: string): string | null {
  const t = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t.slice(0, 7);
}

function shortDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const wk = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()];
  return `${wk} ${d}`;
}

function shortWeekLabel(mondayIso: string): string {
  const [y, m, d] = mondayIso.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (x: Date) => `${x.getDate()}/${x.getMonth() + 1}`;
  return `${fmt(start)}–${fmt(end)}`;
}

function monthHeading(key: string): string {
  const [y, mo] = key.split('-').map(Number);
  const dt = new Date(y, mo - 1, 1);
  return dt.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
}

/**
 * Buckets applications by applied_date for the rubric views (day / week / month).
 * Only reads ISO date strings already persisted in SQLite.
 */
export function aggregateApplicationsByPeriod(
  appliedDates: readonly string[],
  period: InsightPeriod,
  now: Date = new Date(),
): InsightBucket[] {
  const validDates = appliedDates.filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim()));

  if (period === 'day') {
    const buckets: InsightBucket[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = toIsoDate(d);
      const count = validDates.filter((x) => x.trim() === key).length;
      buckets.push({
        label: shortDayLabel(key),
        sortKey: key,
        count,
      });
    }
    return buckets;
  }

  if (period === 'week') {
    const counts = new Map<string, number>();
    for (const iso of validDates) {
      const mk = mondayKeyFromIsoDate(iso);
      if (!mk) continue;
      counts.set(mk, (counts.get(mk) ?? 0) + 1);
    }

    const out: InsightBucket[] = [];
    const currentMonday = mondayKeyFromIsoDate(toIsoDate(now))!;
    const anchor = new Date(
      Number(currentMonday.slice(0, 4)),
      Number(currentMonday.slice(5, 7)) - 1,
      Number(currentMonday.slice(8, 10)),
    );
    for (let w = 7; w >= 0; w--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - w * 7);
      const key = toIsoDate(d);
      out.push({
        label: shortWeekLabel(key),
        sortKey: key,
        count: counts.get(key) ?? 0,
      });
    }
    return out;
  }

  const counts = new Map<string, number>();
  for (const iso of validDates) {
    const mk = monthKeyFromIsoDate(iso);
    if (!mk) continue;
    counts.set(mk, (counts.get(mk) ?? 0) + 1);
  }

  const out: InsightBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({
      label: monthHeading(key),
      sortKey: key,
      count: counts.get(key) ?? 0,
    });
  }
  return out;
}

export function maxBucketCount(buckets: readonly InsightBucket[]): number {
  return buckets.reduce((m, b) => Math.max(m, b.count), 0);
}

/** Same bucket key as `aggregateApplicationsByPeriod` uses (`sortKey`). */
export function bucketKeyForAppliedDate(iso: string, period: InsightPeriod): string | null {
  const t = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  if (period === 'day') return t;
  if (period === 'week') return mondayKeyFromIsoDate(t);
  return monthKeyFromIsoDate(t);
}

export type MeanMetricBucket = { label: string; sortKey: string; mean: number; count: number };

/** Per time bucket: mean primary metric among applications in that bucket (same window as count charts). */
export function aggregateMeanMetricByBuckets(
  rows: readonly { appliedDate: string; metricValue: number }[],
  period: InsightPeriod,
  now: Date = new Date(),
): MeanMetricBucket[] {
  const base = aggregateApplicationsByPeriod(
    rows.map((r) => r.appliedDate),
    period,
    now,
  );
  return base.map((b) => {
    const inB = rows.filter((r) => {
      if (!isAppliedDateInInsightWindow(r.appliedDate, period, now)) return false;
      const k = bucketKeyForAppliedDate(r.appliedDate, period);
      return k === b.sortKey;
    });
    const n = inB.length;
    const mean = n > 0 ? Math.round((inB.reduce((s, r) => s + r.metricValue, 0) / n) * 10) / 10 : 0;
    return { label: b.label, sortKey: b.sortKey, mean, count: n };
  });
}

export type PeakBucket = { label: string; count: number; sortKey: string };

/** Busiest bucket in the window (ties broken by later `sortKey`). */
export function peakBucket(buckets: readonly InsightBucket[]): PeakBucket | null {
  let best: InsightBucket | null = null;
  for (const b of buckets) {
    if (b.count === 0) continue;
    if (!best || b.count > best.count || (b.count === best.count && b.sortKey > best.sortKey)) {
      best = b;
    }
  }
  return best ? { label: best.label, count: best.count, sortKey: best.sortKey } : null;
}

export type WindowMomentum = { firstTotal: number; secondTotal: number };

/** Splits the timeline in half and sums application counts (simple “front vs back” of the window). */
export function windowMomentum(buckets: readonly InsightBucket[]): WindowMomentum | null {
  if (buckets.length < 2) return null;
  const mid = Math.floor(buckets.length / 2);
  const firstTotal = buckets.slice(0, mid).reduce((s, b) => s + b.count, 0);
  const secondTotal = buckets.slice(mid).reduce((s, b) => s + b.count, 0);
  return { firstTotal, secondTotal };
}

/** Distinct high-contrast colours for charts (WCAG-friendly on white / dark grey). */
export const INSIGHT_CHART_PALETTE = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#a855f7',
  '#ca8a04',
  '#db2777',
  '#0d9488',
  '#c026d3',
] as const;

export type SliceDatum = { label: string; count: number; color: string };

/**
 * True when an application applied date falls inside the same rolling window
 * used by aggregateApplicationsByPeriod (14 days / 8 weeks / 12 months).
 */
export function isAppliedDateInInsightWindow(
  iso: string,
  period: InsightPeriod,
  now: Date = new Date(),
): boolean {
  const t = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;

  if (period === 'day') {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      if (toIsoDate(d) === t) return true;
    }
    return false;
  }

  if (period === 'week') {
    const appMonday = mondayKeyFromIsoDate(t);
    if (!appMonday) return false;
    const currentMonday = mondayKeyFromIsoDate(toIsoDate(now))!;
    const anchor = new Date(
      Number(currentMonday.slice(0, 4)),
      Number(currentMonday.slice(5, 7)) - 1,
      Number(currentMonday.slice(8, 10)),
    );
    for (let w = 7; w >= 0; w--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - w * 7);
      if (toIsoDate(d) === appMonday) return true;
    }
    return false;
  }

  const mKey = monthKeyFromIsoDate(t);
  if (!mKey) return false;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key === mKey) return true;
  }
  return false;
}

export function filterRowsInInsightWindow<T extends { appliedDate: string }>(
  rows: readonly T[],
  period: InsightPeriod,
  now: Date = new Date(),
): T[] {
  return rows.filter((r) => isAppliedDateInInsightWindow(r.appliedDate, period, now));
}

export function aggregateSlicesByField<T>(
  rows: readonly T[],
  getField: (row: T) => string,
  colorAtIndex: (index: number) => string,
): SliceDatum[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = getField(r).trim() || 'Unknown';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], i) => ({ label, count, color: colorAtIndex(i) }));
}

export function aggregateCategoryMix(
  rows: readonly { categoryName: string; categoryColor: string }[],
): SliceDatum[] {
  const order: string[] = [];
  const map = new Map<string, { count: number; color: string }>();
  for (const r of rows) {
    const name = r.categoryName.trim() || 'Uncategorised';
    const color = r.categoryColor.trim() || '#64748b';
    const cur = map.get(name);
    if (cur) cur.count += 1;
    else {
      map.set(name, { count: 1, color });
      order.push(name);
    }
  }
  return order.map((name) => {
    const x = map.get(name)!;
    return { label: name, count: x.count, color: x.color };
  });
}

export type AvgMetricRow = { label: string; avg: number; count: number; color: string };

export function averageMetricByStatus(
  rows: readonly { status: string; metricValue: number }[],
  colorAtIndex: (index: number) => string,
): AvgMetricRow[] {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const k = r.status.trim() || 'Unknown';
    const cur = sums.get(k) ?? { sum: 0, n: 0 };
    cur.sum += r.metricValue;
    cur.n += 1;
    sums.set(k, cur);
  }
  return [...sums.entries()]
    .map(([label, { sum, n }], i) => ({
      label,
      avg: n > 0 ? Math.round((sum / n) * 10) / 10 : 0,
      count: n,
      color: colorAtIndex(i),
    }))
    .sort((a, b) => b.count - a.count);
}
