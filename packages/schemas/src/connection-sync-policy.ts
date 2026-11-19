/**
 * Who may press Sync now: anyone until the first sync has finished (to see the
 * connection work), admins always. Nightly syncs cover the rest.
 */
export const canSyncNow = (
  role: string | undefined,
  lastSyncedAt: number | null,
): boolean => role === 'admin' || lastSyncedAt === null;
