/**
 * Drizzle schema for the Job Application Tracker.
 *
 * References:
 * - Drizzle ORM (SQLite core): https://orm.drizzle.team/docs/sql-schema-declaration
 */
import { foreignKey, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const applications = sqliteTable(
  'applications',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),

    // Brief requirements: date + metric + category reference + optional notes
    appliedDate: text('applied_date').notNull(), // ISO date string: YYYY-MM-DD
    metricValue: integer('metric_value', { mode: 'number' }).notNull(), // numeric metric (hours, stages, etc.)
    categoryId: integer('category_id', { mode: 'number' }).notNull(),
    notes: text('notes'),

    // Basic job app fields
    company: text('company').notNull(),
    role: text('role').notNull(),
    status: text('status').notNull(), // current status snapshot (details live in logs)

    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (t) => ({
    categoryFk: foreignKey({ columns: [t.categoryId], foreignColumns: [categories.id] }),
  }),
);

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

export const targets = sqliteTable(
  'targets',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),

    // "global" targets use categoryId = null
    scope: text('scope').notNull(), // "global" | "category"
    categoryId: integer('category_id', { mode: 'number' }),

    periodType: text('period_type').notNull(), // "week" | "month"
    periodStart: text('period_start').notNull(), // ISO date (YYYY-MM-DD)
    goalCount: integer('goal_count', { mode: 'number' }).notNull(),

    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (t) => ({
    categoryFk: foreignKey({ columns: [t.categoryId], foreignColumns: [categories.id] }),
  }),
);

