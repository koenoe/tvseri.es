import 'server-only';

import type { User, WatchProvider } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

/** The profile owner: what `GET /user/by-username/:username` makes public */
export type ProfileUser = Readonly<{
  id: string;
  username: string;
  createdAt: string;
  watchProviders: ReadonlyArray<WatchProvider>;
}>;

const LOOKUP = '/user/by-username/:username';

const toProfileUser = (user: Partial<User> | null): ProfileUser | null =>
  user?.id && user.username && user.createdAt
    ? {
        createdAt: user.createdAt,
        id: user.id,
        username: user.username,
        watchProviders: user.watchProviders ?? [],
      }
    : null;

/**
 * `GET /user/by-username/:username`: the public identity, null on 404. The
 * API's CDN keeps the answer a minute plus ten stale (`profileLookup`), a
 * 404 too, under one key per username that every profile and Stats page
 * shares. So a rename shows there within that life, and the owner's own
 * pages never trust it (`resolveProfileUser`).
 */
export async function loadProfileUser(
  username: string,
): Promise<ProfileUser | null> {
  return toProfileUser(
    await apiFetch<Partial<User>>(LOOKUP, {
      notFound: 'null',
      params: { username },
    }),
  );
}

/**
 * Who has this username, for Settings' availability check: the same lookup
 * under its own CDN key (`?purpose=check`, which the API ignores). A name
 * typed while it is free is a cached 404 there, never in the key the
 * profile pages read, so the new name's profile works right after the
 * rename. The owner's id, or null when nobody has it.
 */
export async function lookupUsernameOwner(
  username: string,
): Promise<string | null> {
  const user = await apiFetch<Partial<User>>(LOOKUP, {
    notFound: 'null',
    params: { username },
    query: { purpose: 'check' },
  });
  return user?.id ?? null;
}

/**
 * The profile at `username` as the signed-in `viewerId` sees it, or null
 * (the 404). Someone else's profile is the shared lookup. The viewer's own
 * profile is their account (`loadOwnUser`, `GET /me`, read per viewer), not
 * the CDN's copy: services they just changed show at once, the new name
 * works right after a rename even if the CDN still holds a 404 for it, and
 * the old name is gone for them at once. Only when their account can't be
 * read does their own profile fall back to the shared copy.
 */
export async function resolveProfileUser(
  username: string,
  viewerId: string,
  loadOwnUser: () => Promise<User | null>,
): Promise<Readonly<{ user: ProfileUser; isOwner: boolean }> | null> {
  const shared = await loadProfileUser(username);
  if (shared && shared.id !== viewerId) {
    return { isOwner: false, user: shared };
  }
  const own = await loadOwnUser();
  const ownProfile = own?.username === username ? toProfileUser(own) : null;
  if (ownProfile) {
    return { isOwner: true, user: ownProfile };
  }
  return shared && !own ? { isOwner: true, user: shared } : null;
}
