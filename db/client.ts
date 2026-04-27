/**
 * **Persistence (offline):** a single SQLite file `careerboost.db` on the device, opened with Expo’s
 * `expo-sqlite` `openDatabaseSync`. All application, category, target, status-log, and (after login) user rows live
 * here only — no cloud database.
 *
 * **Drizzle ORM** is the typed access layer (`db`); schema lives in `db/schema.ts`, SQL migrations in `drizzle/`.
 * `app/_layout.tsx` runs `useMigrations(db, migrations)` first, then `seedDb()` when the DB is empty so demos have
 * enough rows for Insights charts and Targets.
 *
 * **Privacy:** this file is not uploaded anywhere by the app — data stays in the local SQLite file on the device
 * unless the user explicitly exports or shares content from a screen.
 *
 * References — SQLite + Drizzle on Expo:
 * - expo-sqlite: https://docs.expo.dev/versions/latest/sdk/sqlite/
 * - Drizzle ORM docs: https://orm.drizzle.team/docs/overview
 * - Drizzle GitHub: https://github.com/drizzle-team/drizzle-orm
 * - Expo SQLite + Drizzle guide: https://docs.expo.dev/guides/using-sqlite-with-drizzle/
 */

// imports
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

// Single local database file (do not commit *.db to git)
export const sqlite = openDatabaseSync('careerboost.db');

// pragma – enforce foreign keys on this connection (sqlite default is off)
sqlite.execSync('PRAGMA foreign_keys = ON;');

/** Typed Drizzle client — all reads/writes go through `db`; Insights and CSV export query these APIs only. */
export const db = drizzle(sqlite);
