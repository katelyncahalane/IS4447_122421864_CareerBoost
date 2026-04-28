// Unit tests (rubric item 10): seedDb inserts sample data into core tracker tables used for Insights and lists:
// categories, applications, application_status_logs, targets (coursework analogues: habits/trips/logs/targets).
// Covers idempotency (no duplicate rows on second run) and referential consistency (FK-style checks in mock store).

import { SEED_EXPECTED_APPLICATIONS_MIN, seedDb } from '@/db/seed';
import { applicationStatusLogs, applications, categories, targets } from '@/db/schema';

type TableName = 'categories' | 'applications' | 'application_status_logs' | 'targets';

type Row = Record<string, unknown>;

/** Mutable store reset between tests so idempotency is tested from an empty “DB”. */
const seedMockTables: Record<TableName, Row[]> = {
  categories: [],
  applications: [],
  application_status_logs: [],
  targets: [],
};

const seedNextId: Record<TableName, number> = {
  categories: 1,
  applications: 1,
  application_status_logs: 1,
  targets: 1,
};

function resetSeedMockTables() {
  for (const k of Object.keys(seedMockTables) as TableName[]) {
    seedMockTables[k].length = 0;
  }
  seedNextId.categories = 1;
  seedNextId.applications = 1;
  seedNextId.application_status_logs = 1;
  seedNextId.targets = 1;
}

jest.mock('@/db/client', () => {
  const schema = jest.requireActual('@/db/schema') as typeof import('@/db/schema');
  const tableNameFromLocal = (table: unknown): TableName => {
    if (table === schema.categories) return 'categories';
    if (table === schema.applications) return 'applications';
    if (table === schema.applicationStatusLogs) return 'application_status_logs';
    if (table === schema.targets) return 'targets';
    throw new Error('Unknown table');
  };

  const db = {
    select: (shape?: any) => ({
      from: async (table: unknown) => {
        const name = tableNameFromLocal(table);
        if (shape && name === 'applications' && 'id' in shape && 'company' in shape) {
          return seedMockTables.applications.map((r) => ({
            id: r.id as number,
            company: r.company as string,
            status: (r.status as string) ?? 'Applied',
          }));
        }
        return [{ c: seedMockTables[name].length }];
      },
    }),

    insert: (table: unknown) => ({
      values: (rows: Row | Row[]) => {
        const name = tableNameFromLocal(table);
        const arr = Array.isArray(rows) ? rows : [rows];
        const startIdx = seedMockTables[name].length;
        for (const r of arr) {
          seedMockTables[name].push({ id: seedNextId[name]++, ...r });
        }
        return {
          returning: async (shape?: unknown) => {
            if (shape && name === 'categories') {
              return seedMockTables.categories.map((r) => ({ id: r.id as number, name: r.name as string }));
            }
            if (shape && name === 'applications') {
              const inserted = seedMockTables.applications.slice(startIdx);
              return inserted.map((r) => ({
                id: r.id as number,
                company: r.company as string,
              }));
            }
            return [];
          },
        };
      },
    }),

    transaction: async (fn: (tx: any) => Promise<void>) => {
      await fn(db);
    },
  };

  return { db };
});

beforeEach(() => {
  resetSeedMockTables();
});

describe('seedDb (unit)', () => {
  it('inserts sample rows into categories, applications, application_status_logs, and targets without throwing', async () => {
    await expect(seedDb()).resolves.toBeUndefined();

    const { db } = require('@/db/client');
    const catCount = (await (db as any).select({ c: 1 }).from(categories))[0].c as number;
    const appCount = (await (db as any).select({ c: 1 }).from(applications))[0].c as number;
    const logCount = (await (db as any).select({ c: 1 }).from(applicationStatusLogs))[0].c as number;
    const targetCount = (await (db as any).select({ c: 1 }).from(targets))[0].c as number;

    expect(catCount).toBeGreaterThanOrEqual(5);
    expect(appCount).toBeGreaterThanOrEqual(SEED_EXPECTED_APPLICATIONS_MIN);
    expect(logCount).toBeGreaterThanOrEqual(appCount);
    expect(targetCount).toBeGreaterThanOrEqual(8);

    const catNames = seedMockTables.categories.map((r) => r.name as string);
    expect(catNames).toContain('Software Engineering');
    expect(seedMockTables.targets.some((r) => r.scope === 'global')).toBe(true);
    expect(seedMockTables.targets.some((r) => r.scope === 'category')).toBe(true);

    const categoryIds = new Set(seedMockTables.categories.map((r) => r.id as number));
    for (const app of seedMockTables.applications) {
      expect(categoryIds.has(app.categoryId as number)).toBe(true);
    }
    const applicationIds = new Set(seedMockTables.applications.map((r) => r.id as number));
    for (const log of seedMockTables.application_status_logs) {
      expect(applicationIds.has(log.applicationId as number)).toBe(true);
    }
    for (const t of seedMockTables.targets) {
      if (t.scope === 'category' && t.categoryId != null) {
        expect(categoryIds.has(t.categoryId as number)).toBe(true);
      }
    }
  });

  it('does not duplicate any core table rows when seedDb runs twice on an empty store (idempotent)', async () => {
    const { db } = require('@/db/client');
    const counts = async () => ({
      categories: (await (db as any).select({ c: 1 }).from(categories))[0].c as number,
      applications: (await (db as any).select({ c: 1 }).from(applications))[0].c as number,
      logs: (await (db as any).select({ c: 1 }).from(applicationStatusLogs))[0].c as number,
      targets: (await (db as any).select({ c: 1 }).from(targets))[0].c as number,
    });

    await seedDb();
    const afterFirst = await counts();
    expect(afterFirst.applications).toBeGreaterThan(0);

    await seedDb();
    const afterSecond = await counts();
    expect(afterSecond).toEqual(afterFirst);
  });
});
