import 'server-only';

import { getViewer } from '@/auth/viewer';
import type { LibraryRead } from '@/lib/profile/shelfPage';
import type { ProfileViewer } from '@/lib/profile/user';

import { looksLikeOwnProfile } from './ownerHint';
import type { Profile, ProfileParams } from './profile';

/**
 * The Library's reads, keyed by the URL's username so they start at once,
 * beside the profile read instead of after it (no waterfall: the API takes
 * `@username` in the id's place). `guess` is who is looking, from the display
 * cookie (`looksLikeOwnProfile`): the page checks it against the profile
 * read and reads again in the rare case it was wrong. `null` signed out (the
 * profile read answers the 401).
 */
export async function libraryRead(
  params: ProfileParams,
): Promise<Readonly<{ guess: ProfileViewer; read: LibraryRead }> | null> {
  const [{ username }, viewer] = await Promise.all([params, getViewer()]);
  if (!viewer) {
    return null;
  }
  const guess = (await looksLikeOwnProfile(username)) ? 'owner' : 'visitor';
  return {
    guess,
    read: { accessToken: viewer.accessToken, userId: `@${username}` },
  };
}

/**
 * A read started on the cookie's `guess`, settled by the verified profile:
 * its value only when the profile agrees on who is looking, otherwise the
 * read again as the profile says (`readAs`). A failed guessed read throws
 * only when it is the one kept.
 */
export async function settleGuess<T>(
  guess: ProfileViewer,
  verified: Promise<Profile>,
  guessed: Promise<T>,
  readAs: (viewer: ProfileViewer) => Promise<T>,
): Promise<Readonly<{ profile: Profile; value: T }>> {
  const attempt = guessed.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ error, ok: false as const }),
  );
  const [profile, settled] = await Promise.all([verified, attempt]);
  if (profile.viewer === guess) {
    if (!settled.ok) {
      throw settled.error;
    }
    return { profile, value: settled.value };
  }
  return { profile, value: await readAs(profile.viewer) };
}
