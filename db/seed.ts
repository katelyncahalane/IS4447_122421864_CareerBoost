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

/** yyyy-mm-dd from local calendar parts */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgoIso(now: Date, daysAgo: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
  return toIsoDate(d);
}

function monthStartIso(now: Date): string {
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function mondayStartIso(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

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

  const nowMs = Date.now();
  const now = new Date(nowMs);

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
        { name: 'Software Engineering', color: '#2563eb', icon: 'code', createdAt: nowMs },
        { name: 'Data / Analytics', color: '#16a34a', icon: 'chart', createdAt: nowMs },
        { name: 'Product / UX', color: '#a855f7', icon: 'palette', createdAt: nowMs },
        { name: 'Cyber / IT Support', color: '#ea580c', icon: 'shield', createdAt: nowMs },
        { name: 'Marketing / Content', color: '#db2777', icon: 'megaphone', createdAt: nowMs },
      ])
      .returning({ id: categories.id, name: categories.name });

    // map – look up category id by human-readable name
    const catByName = Object.fromEntries(insertedCategories.map((c) => [c.name, c.id])) as Record<
      string,
      number
    >;

    // anchors – current week/month for targets + “in-window” insights
    const weekStart = mondayStartIso(now);
    const monthStart = monthStartIso(now);

    const statuses = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;
    const catCycle = [
      'Software Engineering',
      'Data / Analytics',
      'Product / UX',
      'Cyber / IT Support',
      'Marketing / Content',
    ] as const;

    // insert – lots of applications across day/week/month windows so all 6 visuals are always populated
    const appRows: (typeof applications.$inferInsert)[] = [];

    const pretendCompanies = [
      'Oakridge Technologies',
      'BlueRiver Systems',
      'Lighthouse Digital',
      'Meadowfield Consulting',
      'Juniper Labs',
      'Harbourline Software',
      'Summit Ridge Group',
      'CanalWorks Studio',
      'Northwind Retail',
      'Riverbank Analytics',
      'Greenfield Health',
      'CedarPoint Media',
    ] as const;

    // daily window (last 14 days): multiple per day → obvious bar + line + status pie
    for (let d = 0; d < 14; d++) {
      const n = d % 4 === 0 ? 3 : d % 3 === 0 ? 2 : 1; // 1–3 per day
      for (let k = 0; k < n; k++) {
        const idx = d * 3 + k;
        const catName = catCycle[idx % catCycle.length]!;
        const status = statuses[(idx + 2) % statuses.length]!;
        const companyBase = pretendCompanies[idx % pretendCompanies.length]!;
        const seedNum = idx + 1;
        appRows.push({
          company: `${companyBase} #${String(seedNum).padStart(2, '0')}`,
          role: ['Junior Developer', 'Data Analyst Intern', 'UX Assistant', 'IT Support', 'Content Intern'][idx % 5]!,
          appliedDate: daysAgoIso(now, d),
          metricValue: 1 + ((idx * 2) % 7), // 1..7
          categoryId: catByName[catName]!,
          notes:
            k === 0 && d % 2 === 0
              ? 'Seeded demo entry for insights and charts.'
              : null,
          status,
          createdAt: nowMs,
        });
      }
    }

    // weekly window (beyond 14 days but within ~8 weeks): ensures weekly view has shape even if daily is sparse
    // Use whole-week offsets so status indexing is always an integer.
    for (let week = 1; week <= 7; week++) {
      const daysAgo = 14 + week * 7;
      const idx = 100 + week;
      const catName = catCycle[(idx + 1) % catCycle.length]!;
      const companyBase = pretendCompanies[(idx + 2) % pretendCompanies.length]!;
      appRows.push({
        company: `${companyBase} #W${week}`,
        role: 'Graduate Developer',
        appliedDate: daysAgoIso(now, daysAgo),
        metricValue: 2 + (week % 5),
        categoryId: catByName[catName]!,
        notes: 'Seed: weekly bucket filler.',
        status: statuses[week % statuses.length]!,
        createdAt: nowMs,
      });
    }

    // monthly spread (up to ~11 months back): guarantees monthly view always shows activity
    for (let m = 1; m <= 11; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const iso = toIsoDate(d);
      const idx = 200 + m;
      const catName = catCycle[idx % catCycle.length]!;
      const companyBase = pretendCompanies[(idx + 3) % pretendCompanies.length]!;
      appRows.push({
        company: `${companyBase} #M${String(m).padStart(2, '0')}`,
        role: 'Graduate Programme',
        appliedDate: iso,
        metricValue: 1 + (m % 7),
        categoryId: catByName[catName]!,
        notes: 'Seed: monthly bucket filler.',
        status: statuses[(m + 1) % statuses.length]!,
        createdAt: nowMs,
      });
    }

    await tx.insert(applications).values(appRows);

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

    // insert – status timelines (each application gets at least one log; some get 2–3 for richer history)
    const logRows: (typeof applicationStatusLogs.$inferInsert)[] = [];
    for (const a of apps) {
      const base = nowMs - 1000 * 60 * 60 * 2; // 2 hours ago
      const seedNumMatch = a.company.match(/#(\d{2})$/);
      const seedNum = seedNumMatch ? Number(seedNumMatch[1]) : null;
      const seq =
        seedNum != null && seedNum % 5 === 0
          ? ['Applied', 'Screening', 'Interview']
          : seedNum != null && seedNum % 4 === 0
            ? ['Applied', 'Screening']
            : ['Applied'];

      for (let i = 0; i < seq.length; i++) {
        logRows.push({
          applicationId: a.id,
          status: seq[i]!,
          note: i === 0 ? 'Seed: submitted application' : i === 1 ? 'Seed: recruiter screen' : 'Seed: interview booked',
          createdAt: base - i * 1000 * 60 * 60 * 24,
        });
      }
    }
    await tx.insert(applicationStatusLogs).values(logRows);

    // insert – sample targets (global + per category)
    await tx.insert(targets).values([
      {
        scope: 'global',
        categoryId: null,
        periodType: 'week',
        periodStart: weekStart,
        goalCount: 10,
        createdAt: nowMs,
      },
      {
        scope: 'global',
        categoryId: null,
        periodType: 'month',
        periodStart: monthStart,
        goalCount: 40,
        createdAt: nowMs,
      },
      {
        scope: 'category',
        categoryId: catByName['Software Engineering']!,
        periodType: 'week',
        periodStart: weekStart,
        goalCount: 5,
        createdAt: nowMs,
      },
      {
        scope: 'category',
        categoryId: catByName['Data / Analytics']!,
        periodType: 'month',
        periodStart: monthStart,
        goalCount: 8,
        createdAt: nowMs,
      },
      {
        scope: 'category',
        categoryId: catByName['Product / UX']!,
        periodType: 'month',
        periodStart: monthStart,
        goalCount: 6,
        createdAt: nowMs,
      },
      {
        scope: 'category',
        categoryId: catByName['Cyber / IT Support']!,
        periodType: 'week',
        periodStart: weekStart,
        goalCount: 3,
        createdAt: nowMs,
      },
    ]);
  });
}
