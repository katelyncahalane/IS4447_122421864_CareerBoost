// drizzle kit config – generate sql migrations from schema (run after schema edits)

// imports
import { defineConfig } from 'drizzle-kit';

// config – expo sqlite driver output folder
export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
