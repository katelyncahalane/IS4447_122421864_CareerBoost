/**
 * Single seed entrypoint for CareerBoost (`seedDb`).
 * Populates ALL coursework tables in one transaction when the DB is empty:
 *   categories → applications → application_status_logs → targets
 * Each application has: applied_date, metric_value, category_id, optional notes, current status;
 * logs show status changes over time; targets are weekly/monthly (global + per-category).
 * Idempotent: if any row exists in those four tables, the whole seed is skipped (no duplicates).
 */

// imports
import { count } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  applicationStatusLogs,
  applications,
  categories,
  targets,
} from '@/db/schema';

// function – idempotent seed for markers / screenshots / charts later
export async function seedDb(): Promise<void> {
  // helper – total row count across the four core tables
  const sumCounts = async () => {
    const c1 = (await db.select({ c: count() }).from(categories))[0]?.c ?? 0;
    const c2 = (await db.select({ c: count() }).from(applications))[0]?.c ?? 0;
    const c3 = (await db.select({ c: count() }).from(applicationStatusLogs))[0]?.c ?? 0;
    const c4 = (await db.select({ c: count() }).from(targets))[0]?.c ?? 0;
    return c1 + c2 + c3 + c4;
  };

  // guard – skip if user already has any data (avoid dup demo)
  if ((await sumCounts()) > 0) return;

  const now = Date.now();

  // transaction – all-or-nothing insert block
  await db.transaction(async (tx) => {
    // inner guard – race-safe if two seeds start together
    const sumCountsTx = async () => {
      const c1 = (await tx.select({ c: count() }).from(categories))[0]?.c ?? 0;
      const c2 = (await tx.select({ c: count() }).from(applications))[0]?.c ?? 0;
      const c3 = (await tx.select({ c: count() }).from(applicationStatusLogs))[0]?.c ?? 0;
      const c4 = (await tx.select({ c: count() }).from(targets))[0]?.c ?? 0;
      return c1 + c2 + c3 + c4;
    };

    if ((await sumCountsTx()) > 0) return;
    // insert – demo categories first (apps need their ids)
    const insertedCategories = await tx
      .insert(categories)
      .values([
        { name: 'Software Engineering', color: '#2563eb', icon: 'code', createdAt: now },
        { name: 'Data / Analytics', color: '#16a34a', icon: 'chart', createdAt: now },
        { name: 'Product / UX', color: '#a855f7', icon: 'palette', createdAt: now },
      ])
      .returning({ id: categories.id, name: categories.name });

    // map – look up category id by human-readable name
    const catByName = Object.fromEntries(insertedCategories.map((c) => [c.name, c.id])) as Record<
      string,
      number
    >;

    // constants – demo week / month anchors for targets
    const weekStart = '2026-04-21'; // monday anchor for coursework demo
    const monthStart = '2026-04-01';

    // insert – three sample applications linked to categories
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
      // extra dates so monthly / weekly insights charts are not empty on fresh seed
      {
        company: 'Summit Workshops',
        role: 'UX Intern',
        appliedDate: '2026-03-18',
        metricValue: 1,
        categoryId: catByName['Product / UX']!,
        notes: 'Short placement.',
        status: 'Applied',
        createdAt: now,
      },
      {
        company: 'Canal Digital Labs',
        role: 'Graduate Data Engineer',
        appliedDate: '2026-02-11',
        metricValue: 4,
        categoryId: catByName['Data / Analytics']!,
        notes: 'Take-home task.',
        status: 'Withdrawn',
        createdAt: now,
      },
    ]);

    // query – grab ids so logs can point at the right application rows
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

    // insert – fake timelines for charts / history screens later
    await tx.insert(applicationStatusLogs).values([
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

      {
        applicationId: appIdByCompany['Summit Workshops']!,
        status: 'Applied',
        note: 'Speculative email to hiring lead',
        createdAt: now - 1000 * 60 * 60 * 24 * 3,
      },
      {
        applicationId: appIdByCompany['Summit Workshops']!,
        status: 'Screening',
        note: 'Portfolio link requested',
        createdAt: now - 1000 * 60 * 60 * 24 * 1,
      },

      {
        applicationId: appIdByCompany['Canal Digital Labs']!,
        status: 'Applied',
        note: 'Applied on company careers site',
        createdAt: now - 1000 * 60 * 60 * 24 * 9,
      },
      {
        applicationId: appIdByCompany['Canal Digital Labs']!,
        status: 'Interview',
        note: 'Phone screen with team lead',
        createdAt: now - 1000 * 60 * 60 * 24 * 4,
      },
      {
        applicationId: appIdByCompany['Canal Digital Labs']!,
        status: 'Withdrawn',
        note: 'Accepted another offer',
        createdAt: now - 1000 * 60 * 60 * 24 * 2,
      },
    ]);

    // insert – sample targets (global + per category)
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
