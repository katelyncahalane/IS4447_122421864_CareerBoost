import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

// Single local DB file (local-only; do not commit the .db file)
const sqlite = SQLite.openDatabaseSync('careerboost.db');

export const db = drizzle(sqlite);

