import { defineConfig } from 'drizzle-kit';

// Drizzle Kit config for Expo SQLite migrations.
// https://orm.drizzle.team/docs/get-started/expo-new
export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
