// unit test – seed inserts into applications, categories, targets, and application_status_logs (idempotent)

// imports
import { seedDb } from '@/db/seed';
import { applicationStatusLogs, applications, categories, targets } from '@/db/schema';

// types – fake in-memory table names
type TableName = 'categories' | 'applications' | 'application_status_logs' | 'targets';

type Row = Record<string, unknown>;

// mock – replace real sqlite with tiny in-memory store for fast tests
jest.mock('@/db/client', () => {
  const schema = jest.requireActual('@/db/schema') as typeof import('@/db/schema');
  const tableNameFromLocal = (table: unknown): TableName => {
    if (table === schema.categories) return 'categories';
    if (table === schema.applications) return 'applications';
    if (table === schema.applicationStatusLogs) return 'application_status_logs';
    if (table === schema.targets) return 'targets';
    throw new Error('Unknown table');
  };

  const state: Record<TableName, Row[]> = {
    categories: [],
    applications: [],
    application_status_logs: [],
    targets: [],
  };

  const nextId: Record<TableName, number> = {
    categories: 1,
    applications: 1,
    application_status_logs: 1,
    targets: 1,
  };

  const db = {
    select: (shape?: any) => ({
      from: async (table: unknown) => {
        const name = tableNameFromLocal(table);
        // seed.ts needs to read back { id, company } from applications to create status logs
        if (shape && name === 'applications' && 'id' in shape && 'company' in shape) {
          return state.applications.map((r) => ({ id: r.id as number, company: r.company as string }));
        }
        // default: count-style helper used by seed guards + tests
        return [{ c: state[name].length }];
      },
    }),

    insert: (table: unknown) => ({
      values: (rows: Row | Row[]) => {
        const name = tableNameFromLocal(table);
        const arr = Array.isArray(rows) ? rows : [rows];
        const startIdx = state[name].length;
        for (const r of arr) {
          state[name].push({ id: nextId[name]++, ...r });
        }
        return {
          returning: async (shape?: unknown) => {
            if (shape && name === 'categories') {
              return state.categories.map((r) => ({ id: r.id as number, name: r.name as string }));
            }
            if (shape && name === 'applications') {
              const inserted = state.applications.slice(startIdx);
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

// tests
describe('seedDb', () => {
  it('inserts into all core tables once with no errors', async () => {
    await expect(seedDb()).resolves.toBeUndefined();

    const { db } = require('@/db/client');
    const c1 = (await (db as any).select({ c: 1 }).from(categories))[0].c;
    const c2 = (await (db as any).select({ c: 1 }).from(applications))[0].c;
    const c3 = (await (db as any).select({ c: 1 }).from(applicationStatusLogs))[0].c;
    const c4 = (await (db as any).select({ c: 1 }).from(targets))[0].c;

    expect(c1).toBeGreaterThan(0);
    expect(c2).toBeGreaterThan(0);
    expect(c3).toBeGreaterThan(0);
    expect(c4).toBeGreaterThan(0);
  });

  it('second seed does not duplicate rows (idempotent)', async () => {
    const { db } = require('@/db/client');
    const counts = async () => ({
      categories: (await (db as any).select({ c: 1 }).from(categories))[0].c as number,
      applications: (await (db as any).select({ c: 1 }).from(applications))[0].c as number,
      logs: (await (db as any).select({ c: 1 }).from(applicationStatusLogs))[0].c as number,
      targets: (await (db as any).select({ c: 1 }).from(targets))[0].c as number,
    });

    await seedDb();
    const first = await counts();
    await seedDb();
    const second = await counts();
    expect(second).toEqual(first);
  });
});
