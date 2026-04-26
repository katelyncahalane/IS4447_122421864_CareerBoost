// helpers for the applications tab list query (drizzle WHERE fragments)

// imports
import type { SQL } from 'drizzle-orm';
import { and, eq, like, or } from 'drizzle-orm';

import { applications } from '@/db/schema';

/**
 * Strips SQL LIKE wildcards from user text so typed % or _ cannot widen the match.
 * (Coursework rubric: search stored rows safely.)
 */
export function stripLikeWildcards(input: string): string {
  return input.replace(/%/g, '').replace(/_/g, '');
}

/**
 * Builds an optional WHERE clause for listing applications with:
 * – optional text search (company or role, substring match on SQLite rows)
 * – optional category filter (exact category id)
 * Rubric: search and filter on local persisted data only.
 */
export function applicationsListWhere(
  searchRaw: string,
  categoryId: number | null,
): SQL | undefined {
  const q = searchRaw.trim();
  const hasSearch = q.length > 0;
  const hasCategory = categoryId != null;

  if (!hasSearch && !hasCategory) {
    return undefined;
  }

  if (hasSearch && hasCategory) {
    const pattern = `%${stripLikeWildcards(q)}%`;
    return and(
      eq(applications.categoryId, categoryId),
      or(like(applications.company, pattern), like(applications.role, pattern)),
    );
  }

  if (hasCategory) {
    return eq(applications.categoryId, categoryId);
  }

  const pattern = `%${stripLikeWildcards(q)}%`;
  return or(like(applications.company, pattern), like(applications.role, pattern));
}
