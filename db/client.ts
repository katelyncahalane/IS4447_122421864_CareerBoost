/**
 * SQLite + Drizzle client.
 *
 * References:
 * - expo-sqlite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
 * - Drizzle ORM expo-sqlite driver: https://orm.drizzle.team/docs/get-started-sqlite#expo-sqlite
 */
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

// Single local DB file (local-only; do not commit the .db file)
const sqlite = SQLite.openDatabaseSync('careerboost.db');

export const db = drizzle(sqlite);

