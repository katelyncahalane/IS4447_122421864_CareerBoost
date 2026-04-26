// sqlite client – open local file + drizzle wrapper (offline-first)

// imports
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

// db file on device (do not commit the .db file to git)
export const sqlite = openDatabaseSync('careerboost.db');

// pragma – enforce foreign keys on this connection (sqlite default is off)
sqlite.execSync('PRAGMA foreign_keys = ON;');

// drizzle – typed query builder over the same connection
export const db = drizzle(sqlite);
