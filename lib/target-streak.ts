// Target streaks – consecutive calendar weeks / months where every defined target for that period is met (stored apps + targets only)

import {
  countApplicationsForTarget,
  type ApplicationForTarget,
  type TargetForProgress,
} from '@/lib/target-progress';

function parseIsoDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** Monday-start week anchor (ISO date of Monday) */
export function currentWeekStartIso(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

export function currentMonthStartIso(now: Date = new Date()): string {
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function prevWeekStart(weekStart: string): string {
  const d = parseIsoDate(weekStart);
  if (!d) return weekStart;
  d.setDate(d.getDate() - 7);
  return toIsoDate(d);
}

function nextWeekStart(weekStart: string): string {
  const d = parseIsoDate(weekStart);
  if (!d) return weekStart;
  d.setDate(d.getDate() + 7);
  return toIsoDate(d);
}

function nextMonthStart(monthStart: string): string {
  const d = parseIsoDate(monthStart);
  if (!d) return monthStart;
  return toIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
}

/** null = no weekly targets for this week anchor; true = all met; false = at least one unmet */
export function weekTargetsMetStatus(
  apps: ApplicationForTarget[],
  allTargets: TargetForProgress[],
  weekStart: string,
): boolean | null {
  const subset = allTargets.filter((t) => t.periodType === 'week' && t.periodStart === weekStart);
  if (subset.length === 0) return null;
  return subset.every((t) => countApplicationsForTarget(apps, t) >= t.goalCount);
}

export function monthTargetsMetStatus(
  apps: ApplicationForTarget[],
  allTargets: TargetForProgress[],
  monthStart: string,
): boolean | null {
  const subset = allTargets.filter((t) => t.periodType === 'month' && t.periodStart === monthStart);
  if (subset.length === 0) return null;
  return subset.every((t) => countApplicationsForTarget(apps, t) >= t.goalCount);
}

export type TargetStreakPair = { current: number; best: number };

/** Consecutive week anchors ending at current week where all weekly targets for each anchor are met */
export function computeWeeklyTargetStreak(
  apps: ApplicationForTarget[],
  targets: TargetForProgress[],
  now: Date = new Date(),
): TargetStreakPair {
  const currentWs = currentWeekStartIso(now);
  let current = 0;
  let w = currentWs;
  for (let guard = 0; guard < 520; guard++) {
    const st = weekTargetsMetStatus(apps, targets, w);
    if (st === null) break;
    if (!st) break;
    current += 1;
    w = prevWeekStart(w);
  }

  const anchors = [
    ...new Set(
      targets.filter((t) => t.periodType === 'week').map((t) => t.periodStart),
    ),
  ].sort();
  let best = 0;
  let run = 0;
  let prevAnchor: string | null = null;
  for (const ms of anchors) {
    const met = weekTargetsMetStatus(apps, targets, ms) === true;
    if (!met) {
      run = 0;
      prevAnchor = ms;
      continue;
    }
    if (prevAnchor === null || nextWeekStart(prevAnchor) === ms) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prevAnchor = ms;
  }

  return { current, best };
}

/** Consecutive month starts ending at current month where all monthly targets for that month are met */
export function computeMonthlyTargetStreak(
  apps: ApplicationForTarget[],
  targets: TargetForProgress[],
  now: Date = new Date(),
): TargetStreakPair {
  const cur = currentMonthStartIso(now);
  let current = 0;
  let m = cur;
  for (let guard = 0; guard < 240; guard++) {
    const st = monthTargetsMetStatus(apps, targets, m);
    if (st === null) break;
    if (!st) break;
    current += 1;
    const d = parseIsoDate(m);
    if (!d) break;
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    m = toIsoDate(d);
  }

  const anchors = [
    ...new Set(
      targets.filter((t) => t.periodType === 'month').map((t) => t.periodStart),
    ),
  ].sort();
  let best = 0;
  let run = 0;
  let prevAnchor: string | null = null;
  for (const ms of anchors) {
    const met = monthTargetsMetStatus(apps, targets, ms) === true;
    if (!met) {
      run = 0;
      prevAnchor = ms;
      continue;
    }
    if (prevAnchor === null || nextMonthStart(prevAnchor) === ms) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prevAnchor = ms;
  }

  return { current, best };
}
