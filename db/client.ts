/**
 * SQLite + Drizzle client.
 *
 * References:
 * - expo-sqlite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
 * - Drizzle ORM expo-sqlite driver: https://orm.drizzle.team/docs/get-started-sqlite#expo-sqlite
 */
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

// Single local DB file (local-only; do not commit the .db file)
export const sqlite = openDatabaseSync('careerboost.db');

// SQLite disables foreign keys unless explicitly enabled per connection.
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite);

