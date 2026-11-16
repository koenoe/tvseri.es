import type { GetStartedStatus, User } from '@tvseri.es/schemas';

import { hasListItems } from '@/lib/db/list';
import { markGetStartedDone } from '@/lib/db/user';
import { findWebhookTokenByUserAndType } from '@/lib/db/webhooks';
import { DAY_MS } from '@/utils/time';

/** The card stays this long after all steps are done ("All set") */
const SHOWN_AFTER_DONE_MS = 3 * DAY_MS;
/** ...and never longer than this after sign-up */
const SHOWN_AFTER_SIGNUP_MS = 30 * DAY_MS;

/**
 * The Get started card: three steps derived from what the user
 * already has, so nothing is stored per step. The first time all three are
 * done the time is stamped on the user (`getStartedDoneAt`).
 */
export const getGetStartedStatus = async (
  user: User,
  now: number,
): Promise<GetStartedStatus> => {
  const [alreadySeen, plexToken] = await Promise.all([
    hasListItems(user.id, 'WATCHED'),
    findWebhookTokenByUserAndType({ type: 'plex', userId: user.id }),
  ]);

  const steps = {
    alreadySeen,
    history:
      Boolean(plexToken) ||
      Boolean(user.lastImport && !user.lastImport.undoneAt),
    services: (user.watchProviders?.length ?? 0) > 0,
  };
  const doneCount = Object.values(steps).filter(Boolean).length;

  let doneAt = user.getStartedDoneAt ?? null;
  if (doneAt === null && doneCount === 3) {
    doneAt = (await markGetStartedDone(user.id, now)) ?? now;
  }

  const hidden =
    (doneAt !== null && now - doneAt > SHOWN_AFTER_DONE_MS) ||
    now - Date.parse(user.createdAt) > SHOWN_AFTER_SIGNUP_MS;

  return { doneAt, doneCount, hidden, steps };
};
