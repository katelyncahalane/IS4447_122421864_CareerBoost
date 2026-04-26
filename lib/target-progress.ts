// target progress – count applications that fall inside a target’s week or month window (from stored dates only)

// types – minimal application row for counting
export type ApplicationForTarget = {
  appliedDate: string;
  categoryId: number;
};

// types – target row fields we need (matches drizzle `targets`)
export type TargetForProgress = {
  scope: string;
  categoryId: number | null;
  periodType: string;
  periodStart: string;
  goalCount: number;
};

// helper – parse yyyy-mm-dd to local date (no time zone surprises for coursework)
function parseIsoDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// helper – format local date as yyyy-mm-dd
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

// helper – add whole days to an iso date string
function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

// helper – last calendar day of the month containing `periodStart`
function endOfMonthIso(periodStart: string): string {
  const d = parseIsoDate(periodStart);
  if (!d) return periodStart;
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return toIsoDate(end);
}

// helper – first calendar day of the month containing `periodStart`
function startOfMonthIso(periodStart: string): string {
  const d = parseIsoDate(periodStart);
  if (!d) return periodStart;
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

// function – true if `appliedDate` lies inside the target period (inclusive)
export function isApplicationInTargetPeriod(
  appliedDate: string,
  periodType: string,
  periodStart: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appliedDate.trim())) return false;
  const a = appliedDate.trim();
  if (periodType === 'week') {
    const end = addDaysIso(periodStart, 6);
    return a >= periodStart && a <= end;
  }
  if (periodType === 'month') {
    const start = startOfMonthIso(periodStart);
    const end = endOfMonthIso(periodStart);
    return a >= start && a <= end;
  }
  return false;
}

// function – how many stored applications count toward this target
export function countApplicationsForTarget(
  apps: ApplicationForTarget[],
  target: TargetForProgress,
): number {
  return apps.filter((row) => {
    if (!isApplicationInTargetPeriod(row.appliedDate, target.periodType, target.periodStart)) {
      return false;
    }
    if (target.scope === 'global') return true;
    if (target.scope === 'category' && target.categoryId != null) {
      return row.categoryId === target.categoryId;
    }
    return false;
  }).length;
}
