// insights – bucket counts from stored application dates only (rubric: no fake network data)

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
