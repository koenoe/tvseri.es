import 'server-only';

import type { WatchedItem } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

import { type Profile, withToken } from '../../../_data/profile';

type WatchedPage = Readonly<{ items: ReadonlyArray<WatchedItem> }>;

/**
 * The newest 100 watched episodes (the API's most per page, as History reads
 * it), so a binge of a whole season still leaves five stacks
 */
export async function loadRecent(
  profile: Profile,
): Promise<ReadonlyArray<WatchedItem>> {
  const page = await apiFetch<WatchedPage>('/user/:id/watched', {
    ...withToken(profile),
    params: { id: profile.user.id },
    query: { limit: 100 },
  });
  return page.items;
}
