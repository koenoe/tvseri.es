import 'server-only';

import { cookies } from 'next/headers';

import { USER_DISPLAY_COOKIE_NAME } from '@/auth/cookies';

/**
 * Whether the display cookie names `username`: the guess the pre-paint rule
 * makes (`OwnerVisitor`). Cosmetic, so only a hint to start the owner's
 * reads early, never the answer: the profile read decides who is looking.
 * A cookie that isn't valid URI encoding is no hint.
 */
export async function looksLikeOwnProfile(username: string): Promise<boolean> {
  const shown = (await cookies()).get(USER_DISPLAY_COOKIE_NAME)?.value;
  if (!shown) {
    return false;
  }
  try {
    return decodeURIComponent(shown).toLowerCase() === username.toLowerCase();
  } catch {
    return false;
  }
}
