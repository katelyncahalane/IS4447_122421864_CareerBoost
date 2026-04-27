/**
 * Single seed entrypoint for CareerBoost (`seedDb`).
 *
 * **Persistence:** runs only after Drizzle migrations succeed (`useMigrations` in `app/_layout.tsx`). Writes through
 * the same `db` / transaction API the app uses for normal CRUD.
 *
 * Populates **core tracker tables** when the combined row count across them is zero (idempotent — never duplicates):
 * `categories` → `applications` → `application_status_logs` → `targets`.
 * The `users` table is **not** seeded here (accounts come from Register / Login).
 *
 * Sample volume is intentionally large: dense **last 14 days**, spread across **weeks** and **months**, multiple
 * **statuses** and **categories**, varied **metric_value**, and **notes** on many rows — so Insights (daily / weekly /
 * monthly bars, line, donut, strips) and Targets (met / exceeded / unmet) always have material to render on first launch.
 *
 * @see SEED_EXPECTED_APPLICATIONS_MIN — used by tests to guard minimum demo depth.
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
import { statusTimelineForLatest } from '@/lib/application-statuses';

/** Minimum application rows expected after a first-time seed (raise when adding more demo data). */
export const SEED_EXPECTED_APPLICATIONS_MIN = 45;

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

/** Shift an ISO calendar date by whole days */
function addDaysIso(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return toIsoDate(dt);
}

/** First day of the calendar month before `yyyy-mm-01` */
function previousMonthFirstIso(monthStartIso: string): string {
  const [y, m] = monthStartIso.split('-').map(Number);
  return toIsoDate(new Date(y, m - 2, 1));
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

    // anchors – current + prior week/month for targets and streak-friendly history
    const weekStart = mondayStartIso(now);
    const monthStart = monthStartIso(now);
    const prevWeekStart = addDaysIso(weekStart, -7);
    const prevMonthStart = previousMonthFirstIso(monthStart);

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

    // Current ISO week — extra cluster (Offer / Interview mix, higher metrics) so weekly Insights + Targets pop
    const weekAccentStatuses = ['Offer', 'Interview', 'Screening', 'Applied', 'Offer'] as const;
    for (let di = 0; di < 5; di++) {
      const iso = addDaysIso(weekStart, di);
      const idx = 400 + di;
      const catName = catCycle[idx % catCycle.length]!;
      const companyBase = pretendCompanies[(idx + 4) % pretendCompanies.length]!;
      appRows.push({
        company: `${companyBase}, Week+${di}`,
        role: 'Placement Engineer',
        appliedDate: iso,
        metricValue: 8 + (di % 4),
        categoryId: catByName[catName]!,
        notes: 'Seed: current-week accent for charts and target progress.',
        status: weekAccentStatuses[di % weekAccentStatuses.length]!,
        createdAt: nowMs,
      });
    }

    await tx.insert(applications).values(appRows);

    // query – grab ids so logs can point at the right application rows
    const apps = await tx
      .select({
        id: applications.id,
        company: applications.company,
        status: applications.status,
      })
      .from(applications);

    // insert – status timelines (each application: logs match latest `applications.status`)
    const logRows: (typeof applicationStatusLogs.$inferInsert)[] = [];
    for (const a of apps) {
      const base = nowMs - 1000 * 60 * 60 * 2;
      const seq = [...statusTimelineForLatest(a.status)];
      for (let i = 0; i < seq.length; i++) {
        const st = seq[i]!;
        let note = 'Seed: status update';
        if (st === 'Applied') note = 'Seed: application submitted';
        else if (st === 'Screening') note = 'Seed: recruiter / HR screen';
        else if (st === 'Interview') note = 'Seed: interview stage';
        else if (st === 'Offer') note = 'Seed: offer received';
        else if (st === 'Rejected') note = 'Seed: application not successful';
        else if (st === 'Withdrawn') note = 'Seed: candidate withdrew';
        logRows.push({
          applicationId: a.id,
          status: st,
          note,
          createdAt: base - i * 1000 * 60 * 60 * 24,
        });
      }
    }
    await tx.insert(applicationStatusLogs).values(logRows);

    // insert – targets (global + per-category; current + prior periods; human-readable titles)
    await tx.insert(targets).values([
      {
        title: 'Pipeline: new applications this week (all categories)',
        scope: 'global',
        categoryId: null,
        periodType: 'week',
        periodStart: weekStart,
        goalCount: 10,
        createdAt: nowMs,
      },
      {
        title: 'Pipeline: new applications last week (all categories)',
        scope: 'global',
        categoryId: null,
        periodType: 'week',
        periodStart: prevWeekStart,
        goalCount: 8,
        createdAt: nowMs,
      },
      {
        title: 'Pipeline: applications this calendar month (all categories)',
        scope: 'global',
        categoryId: null,
        periodType: 'month',
        periodStart: monthStart,
        goalCount: 40,
        createdAt: nowMs,
      },
      {
        title: 'Pipeline: applications last calendar month (all categories)',
        scope: 'global',
        categoryId: null,
        periodType: 'month',
        periodStart: prevMonthStart,
        goalCount: 25,
        createdAt: nowMs,
      },
      {
        title: 'Software engineering: weekly outreach volume',
        scope: 'category',
        categoryId: catByName['Software Engineering']!,
        periodType: 'week',
        periodStart: weekStart,
        goalCount: 5,
        createdAt: nowMs,
      },
      {
        title: 'Software engineering: last week volume',
        scope: 'category',
        categoryId: catByName['Software Engineering']!,
        periodType: 'week',
        periodStart: prevWeekStart,
        goalCount: 4,
        createdAt: nowMs,
      },
      {
        title: 'Data & analytics: monthly applications',
        scope: 'category',
        categoryId: catByName['Data / Analytics']!,
        periodType: 'month',
        periodStart: monthStart,
        goalCount: 8,
        createdAt: nowMs,
      },
      {
        title: 'Product & UX: monthly applications',
        scope: 'category',
        categoryId: catByName['Product / UX']!,
        periodType: 'month',
        periodStart: monthStart,
        goalCount: 6,
        createdAt: nowMs,
      },
      {
        title: 'Cyber & IT support: weekly applications',
        scope: 'category',
        categoryId: catByName['Cyber / IT Support']!,
        periodType: 'week',
        periodStart: weekStart,
        goalCount: 3,
        createdAt: nowMs,
      },
      {
        title: 'Marketing & content: weekly applications',
        scope: 'category',
        categoryId: catByName['Marketing / Content']!,
        periodType: 'week',
        periodStart: weekStart,
        goalCount: 2,
        createdAt: nowMs,
      },
    ]);
  });
}
