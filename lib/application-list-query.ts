// helpers for the applications tab list query (drizzle WHERE fragments)

// imports
import type { SQL } from 'drizzle-orm';
import { and, eq, gte, like, lte, or } from 'drizzle-orm';

import { applications } from '@/db/schema';

/** Filters passed from the applications tab (rubric: text, category, date range). */
export type ApplicationsListFilters = {
  searchRaw: string;
  categoryId: number | null;
  /** Inclusive lower bound yyyy-mm-dd; null = no bound */
  dateFrom: string | null;
  /** Inclusive upper bound yyyy-mm-dd; null = no bound */
  dateTo: string | null;
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

/**
 * Builds an optional WHERE clause: text (company/role), category, inclusive applied_date range.
 * If both date bounds are set and from > to, they are swapped for the query (sensible default).
 */
export function applicationsListWhere(filters: ApplicationsListFilters): SQL | undefined {
  const parts: SQL[] = [];

  const q = filters.searchRaw.trim();
  if (q.length > 0) {
    const pattern = `%${stripLikeWildcards(q)}%`;
    parts.push(or(like(applications.company, pattern), like(applications.role, pattern))!);
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

  if (parts.length === 0) {
    return undefined;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return and(...parts);
}
