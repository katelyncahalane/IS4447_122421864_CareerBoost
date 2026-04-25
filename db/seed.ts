import { db } from '@/db/client';
import { applications, categories } from '@/db/schema';

/**
 * Tiny seed for early development.
 * Next steps will expand this to include targets + status logs (for the brief).
 *
 * References:
 * - Drizzle inserts/selects: https://orm.drizzle.team/docs/insert
 * - expo-sqlite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
 */
export async function seedDb(): Promise<void> {
  const now = Date.now();

  // Minimal "no duplicates" behaviour for now: if any category exists, skip.
  const existingCategories = await db.select().from(categories).limit(1);
  if (existingCategories.length > 0) return;

  const inserted = await db
    .insert(categories)
    .values({
      name: 'Software Dev',
      color: '#2563eb',
      icon: 'briefcase',
      createdAt: now,
    })
    .returning({ id: categories.id });

  const categoryId = inserted[0]?.id ?? 1;

  await db.insert(applications).values({
    appliedDate: new Date().toISOString().slice(0, 10),
    metricCount: 1,
    categoryId,
    notes: 'Seeded example application.',
    company: 'Example Tech Ltd',
    role: 'Junior Developer',
    status: 'Applied',
    createdAt: now,
  });
}

