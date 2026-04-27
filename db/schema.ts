/**
 * Drizzle schema for **local SQLite** (`careerboost.db`). Core tracker tables: `categories`, `applications`,
 * `application_status_logs`, `targets`. `users` holds salted credentials for on-device auth only — populated by
 * registration, not by `seedDb`.
 */

// imports
import { foreignKey, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Job families / tracks (e.g. Software Engineering). Each row has **name**, **colour** (`color` hex), and **icon** (short label).
 * Every application record **must** reference one category (`applications.category_id` FK).
 */
export const categories = sqliteTable('categories', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

/**
 * One row per job application (primary record for coursework).
 * Required rubric fields: **applied date** (`applied_date`), **measurable metric** (`metric_value`, integer),
 * and **category reference** (`category_id` → `categories`).
 * `status` is the latest pipeline snapshot; full history lives in `application_status_logs`.
 */
export const applications = sqliteTable(
  'applications',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),

    /** Applied date (ISO yyyy-mm-dd) — required on every primary record. */
    appliedDate: text('applied_date').notNull(),
    /** Measurable metric (whole number, e.g. hours prep or pipeline stage count) — required. */
    metricValue: integer('metric_value', { mode: 'number' }).notNull(),
    /** Category FK — required; drives grouping and insights by track. */
    categoryId: integer('category_id', { mode: 'number' }).notNull(),
    notes: text('notes'),

    company: text('company').notNull(),
    role: text('role').notNull(),
    /** Denormalised latest status; keep in sync when appending `application_status_logs`. */
    status: text('status').notNull(),

    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (t) => ({
    categoryFk: foreignKey({ columns: [t.categoryId], foreignColumns: [categories.id] }),
  }),
);

/**
 * Status timeline per application (one application → many rows, oldest→newest by `created_at`).
 * Typical `status` values: Applied, Screening, Interview, Offer, Rejected, Withdrawn.
 */
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

/**
 * Weekly or monthly application-count goals. `scope` = `"global"` (all categories) or `"category"` (one track).
 * `goal_count` = minimum applications with `applied_date` in that period window; progress is compared in the UI
 * (remaining to goal, met exactly, or exceeded).
 */
export const targets = sqliteTable(
  'targets',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),

    /** Short label shown in the Targets list (e.g. "Pipeline: new applications this week"). */
    title: text('title'),

    scope: text('scope').notNull(), // "global" | "category"
    categoryId: integer('category_id', { mode: 'number' }),

    periodType: text('period_type').notNull(), // "week" | "month"
    periodStart: text('period_start').notNull(), // iso yyyy-mm-dd (week Monday or month 1st)

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
