import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const applications = sqliteTable('applications', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),

  // Brief requirements: date + metric + category reference + optional notes
  appliedDate: text('applied_date').notNull(), // ISO date string: YYYY-MM-DD
  metricCount: integer('metric_count', { mode: 'number' }).notNull(), // e.g. number of applications (usually 1)
  categoryId: integer('category_id', { mode: 'number' }).notNull(),
  notes: text('notes'),

  // Basic job app fields
  company: text('company').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull(), // e.g. Applied / Interview / Rejected

  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

