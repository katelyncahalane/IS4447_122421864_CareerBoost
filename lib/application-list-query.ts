// helpers for the applications tab list query (drizzle WHERE fragments)

// imports
import type { SQL } from 'drizzle-orm';
import { and, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm';

import { applications } from '@/db/schema';

/** Filters passed from the applications tab (search, category, dates, status, metric, notes). */
export type ApplicationsListFilters = {
  searchRaw: string;
  categoryId: number | null;
  /** Inclusive lower bound yyyy-mm-dd; null = no bound */
  dateFrom: string | null;
  /** Inclusive upper bound yyyy-mm-dd; null = no bound */
  dateTo: string | null;
  /** Empty = any status; otherwise rows must match one of these (exact status strings). */
  statuses: readonly string[];
  /** Inclusive lower bound on `metric_value`; null = none */
  metricMin: number | null;
  /** Inclusive upper bound on `metric_value`; null = none */
  metricMax: number | null;
  /** When true, only rows with non-empty trimmed notes */
  hasNotesOnly: boolean;
};

/**
 * Strips SQL LIKE wildcards from user text so typed % or _ cannot widen the match.
 * (Coursework rubric: search stored rows safely.)
 */
export function stripLikeWildcards(input: string): string {
  return input.replace(/%/g, '').replace(/_/g, '');
}

/**
 * Returns yyyy-mm-dd if the string is a valid calendar date, else null.
 * applied_date is stored as ISO date text so lexicographic compare matches chronological order.
 */
export function normaliseIsoDateInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [y, m, d] = t.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return t;
}

/** Parse a positive-integer metric bound from raw input; empty or invalid → null. */
export function parseMetricBound(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/**
 * Builds an optional WHERE clause: text (company, role, status, notes), category, dates, statuses, metric range,
 * notes-only. If both date bounds are set and from > to, they are swapped. Same for metric min/max.
 */
export function applicationsListWhere(filters: ApplicationsListFilters): SQL | undefined {
  const parts: SQL[] = [];

  const q = filters.searchRaw.trim();
  if (q.length > 0) {
    const pattern = `%${stripLikeWildcards(q)}%`;
    parts.push(
      or(
        like(applications.company, pattern),
        like(applications.role, pattern),
        like(applications.status, pattern),
        like(applications.notes, pattern),
      )!,
    );
  }

  if (filters.categoryId != null) {
    parts.push(eq(applications.categoryId, filters.categoryId));
  }

  let from = filters.dateFrom;
  let to = filters.dateTo;
  if (from && to && from > to) {
    [from, to] = [to, from];
  }
  if (from) {
    parts.push(gte(applications.appliedDate, from));
  }
  if (to) {
    parts.push(lte(applications.appliedDate, to));
  }

  if (filters.statuses.length > 0) {
    parts.push(inArray(applications.status, [...filters.statuses]));
  }

  let mMin = filters.metricMin;
  let mMax = filters.metricMax;
  if (mMin != null && mMax != null && mMin > mMax) {
    [mMin, mMax] = [mMax, mMin];
  }
  if (mMin != null) {
    parts.push(gte(applications.metricValue, mMin));
  }
  if (mMax != null) {
    parts.push(lte(applications.metricValue, mMax));
  }

  if (filters.hasNotesOnly) {
    parts.push(sql`trim(coalesce(${applications.notes}, '')) != ''`);
  }

  if (parts.length === 0) {
    return undefined;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return and(...parts);
}
