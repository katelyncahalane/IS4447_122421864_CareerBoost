// wipe all coursework sqlite rows + session (rubric: delete profile; data stays on device until user confirms)

// imports
import { db } from '@/db/client';
import {
  applicationStatusLogs,
  applications,
  categories,
  targets,
  users,
} from '@/db/schema';
import { clearSession } from '@/lib/session';

/**
 * Deletes every row in core tables (FK-safe order), then clears the login session.
 * Next launch can seed again if tables are empty. Local-only; no network.
 */
export async function deleteLocalProfileData(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(applicationStatusLogs);
    await tx.delete(applications);
    await tx.delete(targets);
    await tx.delete(categories);
    await tx.delete(users);
  });
  await clearSession();
}
