// auth – local-only users in SQLite (Drizzle). Passwords stored as salted hashes.

import * as Crypto from 'expo-crypto';

import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

export type AuthUser = { id: number; username: string };

export async function registerLocalUser(params: {
  username: string;
  password: string;
}): Promise<AuthUser> {
  const username = params.username.trim();
  const password = params.password;

  if (!username) throw new Error('Enter a username.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const existing = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing.length > 0) throw new Error('That username is already taken.');

  const salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const passwordHash = await hashPassword(password, salt);

  const createdAt = Date.now();
  const inserted = await db
    .insert(users)
    .values({
      username,
      passwordSalt: salt,
      passwordHash,
      createdAt,
    })
    .returning({ id: users.id, username: users.username });

  const row = inserted[0];
  if (!row) throw new Error('Could not create user.');
  return row;
}

export async function loginLocalUser(params: {
  username: string;
  password: string;
}): Promise<AuthUser> {
  const username = params.username.trim();
  const password = params.password;

  if (!username || !password) throw new Error('Enter your username and password.');

  const found = await db
    .select({
      id: users.id,
      username: users.username,
      passwordSalt: users.passwordSalt,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const u = found[0];
  if (!u) throw new Error('Invalid username or password.');

  const check = await hashPassword(password, u.passwordSalt);
  if (check !== u.passwordHash) throw new Error('Invalid username or password.');

  return { id: u.id, username: u.username };
}

