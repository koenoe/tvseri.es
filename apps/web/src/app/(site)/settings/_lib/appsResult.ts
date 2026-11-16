import type { ActionError } from '@/lib/marking/result';

/**
 * What Connected apps and Your data actions can say beyond the marking
 * errors: `not-enabled` is the API's 403 on delete account (switched off
 * until the owner turns it on), `mismatch` is a typed username that isn't
 * the signed-in user's.
 */
export type AppsActionError = ActionError | 'mismatch' | 'not-enabled';

export type AppsActionResult<T = undefined> = Readonly<
  { ok: true; data: T } | { ok: false; error: AppsActionError }
>;

export const appsOk = <T>(data: T): AppsActionResult<T> => ({
  data,
  ok: true,
});

export const appsError = (error: AppsActionError) =>
  ({ error, ok: false }) as const;
