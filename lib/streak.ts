// streak – consecutive-day streak tracking from stored ISO dates (advanced feature; local-only)

type StreakResult = {
  /** consecutive days ending today with at least one record */
  current: number;
  /** longest consecutive run across the whole dataset */
  best: number;
};

/** yyyy-mm-dd from local calendar parts */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function prevDayIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return toIsoDate(dt);
}

/**
 * Compute streaks from stored ISO date strings.
 * A “streak day” is any day with at least one record (duplicates do not matter).
 */
export function computeDailyStreaks(
  appliedDates: readonly string[],
  now: Date = new Date(),
): StreakResult {
  const days = new Set(appliedDates.filter(isIsoDate).map((s) => s.trim()));
  if (days.size === 0) return { current: 0, best: 0 };

  // Section: current streak (today backwards)
  let current = 0;
  let cursor = toIsoDate(now);
  while (days.has(cursor)) {
    current += 1;
    cursor = prevDayIso(cursor);
  }

  // Section: best streak (scan all unique days in order)
  const sorted = [...days].sort(); // ISO sorts lexicographically by date
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const expectedPrev = prevDayIso(sorted[i]!);
    if (expectedPrev === sorted[i - 1]) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  return { current, best };
}

