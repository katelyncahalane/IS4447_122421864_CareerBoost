import { count } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  applicationStatusLogs,
  applications,
  categories,
  targets,
} from '@/db/schema';

/**
 * Coursework seed data for Option C (Job Application Tracker).
 *
 * Idempotency:
 * - If *any* core table already contains rows, we skip seeding entirely.
 * - This guarantees calling `seedDb()` twice does not duplicate rows.
 *
 * References:
 * - Drizzle transactions: https://orm.drizzle.team/docs/transactions
 * - Drizzle inserts/selects: https://orm.drizzle.team/docs/insert
 * - expo-sqlite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
 */
export async function seedDb(): Promise<void> {
  const sumCounts = async () => {
    const c1 = (await db.select({ c: count() }).from(categories))[0]?.c ?? 0;
    const c2 = (await db.select({ c: count() }).from(applications))[0]?.c ?? 0;
    const c3 = (await db.select({ c: count() }).from(applicationStatusLogs))[0]?.c ?? 0;
    const c4 = (await db.select({ c: count() }).from(targets))[0]?.c ?? 0;
    return c1 + c2 + c3 + c4;
  };

  if ((await sumCounts()) > 0) return;

  const now = Date.now();

  await db.transaction(async (tx) => {
    const sumCountsTx = async () => {
      const c1 = (await tx.select({ c: count() }).from(categories))[0]?.c ?? 0;
      const c2 = (await tx.select({ c: count() }).from(applications))[0]?.c ?? 0;
      const c3 = (await tx.select({ c: count() }).from(applicationStatusLogs))[0]?.c ?? 0;
      const c4 = (await tx.select({ c: count() }).from(targets))[0]?.c ?? 0;
      return c1 + c2 + c3 + c4;
    };

    if ((await sumCountsTx()) > 0) return;
    const insertedCategories = await tx
      .insert(categories)
      .values([
        { name: 'Software Engineering', color: '#2563eb', icon: 'code', createdAt: now },
        { name: 'Data / Analytics', color: '#16a34a', icon: 'chart', createdAt: now },
        { name: 'Product / UX', color: '#a855f7', icon: 'palette', createdAt: now },
      ])
      .returning({ id: categories.id, name: categories.name });

    const catByName = Object.fromEntries(insertedCategories.map((c) => [c.name, c.id])) as Record<
      string,
      number
    >;

    const weekStart = '2026-04-21'; // Monday (local coursework demo anchor)
    const monthStart = '2026-04-01';

    await tx.insert(applications).values([
      {
        company: 'Riverbank Analytics',
        role: 'Graduate Software Engineer',
        appliedDate: '2026-04-22',
        metricValue: 3,
        categoryId: catByName['Software Engineering']!,
        notes: 'Applied online. Completed coding exercise.',
        status: 'Interview',
        createdAt: now,
      },
      {
        company: 'Northwind Retail',
        role: 'Junior React Native Developer',
        appliedDate: '2026-04-10',
        metricValue: 2,
        categoryId: catByName['Software Engineering']!,
        notes: 'Recruiter screen scheduled.',
        status: 'Applied',
        createdAt: now,
      },
      {
        company: 'Harbour Health',
        role: 'Data Analyst Intern',
        appliedDate: '2026-04-05',
        metricValue: 5,
        categoryId: catByName['Data / Analytics']!,
        notes: 'Portfolio link included.',
        status: 'Rejected',
        createdAt: now,
      },
    ]);

    const apps = await tx
      .select({
        id: applications.id,
        company: applications.company,
      })
      .from(applications);

    const appIdByCompany = Object.fromEntries(apps.map((a) => [a.company, a.id])) as Record<
      string,
      number
    >;

    await tx.insert(applicationStatusLogs).values([
      // Riverbank timeline
      {
        applicationId: appIdByCompany['Riverbank Analytics']!,
        status: 'Applied',
        note: 'Submitted application',
        createdAt: now - 1000 * 60 * 60 * 24 * 4,
      },
      {
        applicationId: appIdByCompany['Riverbank Analytics']!,
        status: 'Screening',
        note: 'Recruiter email received',
        createdAt: now - 1000 * 60 * 60 * 24 * 3,
      },
      {
        applicationId: appIdByCompany['Riverbank Analytics']!,
        status: 'Interview',
        note: 'Technical interview booked',
        createdAt: now - 1000 * 60 * 60 * 24 * 1,
      },

      // Northwind timeline
      {
        applicationId: appIdByCompany['Northwind Retail']!,
        status: 'Applied',
        note: 'Applied via LinkedIn Easy Apply',
        createdAt: now - 1000 * 60 * 60 * 24 * 12,
      },
      {
        applicationId: appIdByCompany['Northwind Retail']!,
        status: 'Applied',
        note: 'Follow-up email sent',
        createdAt: now - 1000 * 60 * 60 * 24 * 10,
      },

      // Harbour timeline
      {
        applicationId: appIdByCompany['Harbour Health']!,
        status: 'Applied',
        note: 'Submitted CV + cover letter',
        createdAt: now - 1000 * 60 * 60 * 24 * 18,
      },
      {
        applicationId: appIdByCompany['Harbour Health']!,
        status: 'Interview',
        note: 'Hiring manager interview',
        createdAt: now - 1000 * 60 * 60 * 24 * 14,
      },
      {
        applicationId: appIdByCompany['Harbour Health']!,
        status: 'Rejected',
        note: 'Role filled internally',
        createdAt: now - 1000 * 60 * 60 * 24 * 8,
      },
    ]);

    await tx.insert(targets).values([
      {
        scope: 'global',
        categoryId: null,
        periodType: 'week',
        periodStart: weekStart,
        goalCount: 6,
        createdAt: now,
      },
      {
        scope: 'global',
        categoryId: null,
        periodType: 'month',
        periodStart: monthStart,
        goalCount: 18,
        createdAt: now,
      },
      {
        scope: 'category',
        categoryId: catByName['Software Engineering']!,
        periodType: 'week',
        periodStart: weekStart,
        goalCount: 4,
        createdAt: now,
      },
      {
        scope: 'category',
        categoryId: catByName['Data / Analytics']!,
        periodType: 'month',
        periodStart: monthStart,
        goalCount: 5,
        createdAt: now,
      },
    ]);
  });
}

