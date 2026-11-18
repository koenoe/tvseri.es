import { DAY_MS } from '@tvseri.es/utils';

/** The card is only for new users: asked while the account is under 30 days old (the API hides it then anyway) */
export function isNewAccount(createdAt: string, now: number): boolean {
  const created = new Date(createdAt).getTime();
  return Number.isFinite(created) && now - created < 30 * DAY_MS;
}
