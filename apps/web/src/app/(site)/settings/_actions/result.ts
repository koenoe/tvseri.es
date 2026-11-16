import type { ActionError } from '@/lib/marking/result';

/**
 * What a settings action answers: the marking core's `ActionResult` shape
 * plus `taken` (the username belongs to someone else, a 409). Raw API error
 * text never reaches the client.
 */
export type SettingsActionError = ActionError | 'taken';

export type SettingsActionResult<T = undefined> = Readonly<
  { data: T; ok: true } | { error: SettingsActionError; ok: false }
>;

export const done = <T>(data: T): SettingsActionResult<T> => ({
  data,
  ok: true,
});

export const fail = (error: SettingsActionError) =>
  ({ error, ok: false }) as const;
