// unit test – seed fills all core tables once; second run is a no-op

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
    select: (_shape?: unknown) => ({
      from: async (table: unknown) => [{ c: state[tableNameFromLocal(table)].length }],
    }),

    insert: (table: unknown) => ({
      values: (rows: Row | Row[]) => {
        const name = tableNameFromLocal(table);
        const arr = Array.isArray(rows) ? rows : [rows];
        for (const r of arr) {
          state[name].push({ id: nextId[name]++, ...r });
        }
        return {
          returning: async (shape?: unknown) => {
            if (shape && name === 'categories') {
              return state.categories.map((r) => ({ id: r.id as number, name: r.name as string }));
            }
            if (shape && name === 'applications') {
              const last = state.applications[state.applications.length - 1];
              return last ? [{ id: last.id as number }] : [];
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
  it('inserts into all core tables and is idempotent', async () => {
    await seedDb();

    const { db } = require('@/db/client');
    await expect(seedDb()).resolves.toBeUndefined();

    const c1 = (await (db as any).select({ c: 1 }).from(categories))[0].c;
    const c2 = (await (db as any).select({ c: 1 }).from(applications))[0].c;
    const c3 = (await (db as any).select({ c: 1 }).from(applicationStatusLogs))[0].c;
    const c4 = (await (db as any).select({ c: 1 }).from(targets))[0].c;

    expect(c1).toBeGreaterThan(0);
    expect(c2).toBeGreaterThan(0);
    expect(c3).toBeGreaterThan(0);
    expect(c4).toBeGreaterThan(0);
  });
});
