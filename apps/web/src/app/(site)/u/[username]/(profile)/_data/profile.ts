import 'server-only';

import type { Metadata } from 'next';
import { notFound, permanentRedirect, unauthorized } from 'next/navigation';

import auth from '@/auth';
import { getViewer } from '@/auth/viewer';
import {
  loadProfileUser,
  type ProfileUser,
  type ProfileViewer,
  resolveProfileUser,
} from '@/lib/profile/user';
import profilePath, { type ProfileSegment } from '@/lib/routing/profilePath';

import { orNull } from '../_lib/orNull';
import { looksLikeOwnProfile } from './ownerHint';

/**
 * Who is looking at whose profile. The viewer is the verified token's id
 * and the token itself (`getViewer`), so no `GET /me` sits in front of a
 * visitor's profile read. The owner's own profile is their account
 * (`resolveProfileUser`): one `GET /me`, which `auth()` shares with the
 * owner's blocks that draw their country.
 */
export type Profile = Readonly<{
  user: ProfileUser;
  viewerId: string;
  accessToken: string;
  viewer: ProfileViewer;
}>;

export type ProfileParams = Promise<Readonly<{ username: string }>>;

/**
 * Every `/u/*` page except stats: signed out is the 401 page (every
 * profile is visible to signed-in users, no private profiles), an unknown
 * user is the 404, signed out too (the public Stats pages show who exists
 * anyway, so a made-up handle shouldn't ask you to sign in). Signed out
 * costs the one read the page's metadata makes too; a failed read keeps
 * the 401. Call it inside a Suspense hole: it
 * reads the session. `getViewer()` and the API GETs are memoised per
 * render, so every hole of a page can call it.
 *
 * The page's own hole passes its segment (`at`): another spelling the API
 * resolves (`/u/Rae`) then goes to the canonical URL, one URL per user as on
 * Stats. Its query is not carried over.
 */
export async function getProfile(
  params: ProfileParams,
  at?: ProfileSegment,
): Promise<Profile> {
  const [{ username }, viewer] = await Promise.all([params, getViewer()]);
  if (!viewer) {
    if ((await loadProfileUser(username).catch(() => undefined)) === null) {
      notFound();
    }
    unauthorized();
  }
  if (await looksLikeOwnProfile(username)) {
    // Your own profile is your account: its `GET /me` starts beside the
    // lookup instead of after it (`auth()` shares it per request). Observed
    // here, so a wrong guess leaves no unhandled rejection.
    loadOwnUser().catch(() => undefined);
  }
  const found = await resolveProfileUser(username, viewer.id, loadOwnUser);
  if (!found) {
    notFound();
  }
  if (at !== undefined && found.user.username !== username) {
    permanentRedirect(profilePath(found.user.username, at));
  }
  return {
    accessToken: viewer.accessToken,
    user: found.user,
    viewer: found.isOwner ? 'owner' : 'visitor',
    viewerId: viewer.id,
  };
}

const loadOwnUser = async () => (await auth()).user;

/**
 * `getProfile` for a nicety beside a block (a count, a line that names
 * them): null when the profile read failed (the identity says so), so it
 * leaves its space empty instead of failing too. A 404 or 401 passes.
 */
export const getProfileOrNull = (
  params: ProfileParams,
): Promise<Profile | null> => orNull(getProfile(params));

/** The token every private profile read passes */
export const withToken = (profile: Profile) =>
  ({ accessToken: profile.accessToken }) as const;

/**
 * A profile page's metadata: its title for `username`, and none for a user
 * that doesn't exist or is being deleted (the page 404s inside its stream,
 * after the head was sent, so the head must not name the user). The same
 * `GET /user/by-username` the page makes, deduped per request. A failed read
 * keeps the title: the page says what went wrong.
 */
export async function profileMetadata(
  params: ProfileParams,
  title: (username: string) => string,
): Promise<Metadata> {
  const { username } = await params;
  const user = await loadProfileUser(username).catch(() => undefined);
  return user === null
    ? { robots: { index: false } }
    : { robots: { index: false }, title: title(username) };
}
