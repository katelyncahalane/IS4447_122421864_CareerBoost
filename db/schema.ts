// drizzle schema – tables for job tracker (categories, apps, logs, targets)

// imports
import { foreignKey, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// table – role buckets (name + colour + icon for ui)
export const categories = sqliteTable('categories', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

// table – one row per job application (must link to a category)
export const applications = sqliteTable(
  'applications',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),

    // brief fields – date, metric, category id, optional notes
    appliedDate: text('applied_date').notNull(), // iso yyyy-mm-dd
    metricValue: integer('metric_value', { mode: 'number' }).notNull(), // e.g. hours or stages count
    categoryId: integer('category_id', { mode: 'number' }).notNull(),
    notes: text('notes'),

    // job fields – company + role + current status snapshot
    company: text('company').notNull(),
    role: text('role').notNull(),
    status: text('status').notNull(), // latest status (history in logs table)

    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (t) => ({
    categoryFk: foreignKey({ columns: [t.categoryId], foreignColumns: [categories.id] }),
  }),
);

// table – status changes over time (one app has many rows)
export const applicationStatusLogs = sqliteTable(
  'application_status_logs',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    applicationId: integer('application_id', { mode: 'number' }).notNull(),
    status: text('status').notNull(),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (t) => ({
    applicationFk: foreignKey({ columns: [t.applicationId], foreignColumns: [applications.id] }),
  }),
);

// table – weekly / monthly goals (global or tied to one category)
export const targets = sqliteTable(
  'targets',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),

    // scope – global row uses category id null
    scope: text('scope').notNull(), // "global" | "category"
    categoryId: integer('category_id', { mode: 'number' }),

    periodType: text('period_type').notNull(), // "week" | "month"
    periodStart: text('period_start').notNull(), // iso yyyy-mm-dd (period anchor)
    goalCount: integer('goal_count', { mode: 'number' }).notNull(),

    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (t) => ({
    categoryFk: foreignKey({ columns: [t.categoryId], foreignColumns: [categories.id] }),
  }),
);

// table – local-only auth users (passwords stored as salted hashes; no plaintext)
export const users = sqliteTable('users', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  passwordSalt: text('password_salt').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});
