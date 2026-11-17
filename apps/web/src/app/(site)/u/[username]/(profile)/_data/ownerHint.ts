import 'server-only';

import { cookies } from 'next/headers';

import { readDisplayUsername } from '@/auth/displayUsername';

/**
 * Whether the display cookie names `username`: the guess the pre-paint rule
 * makes (`OwnerVisitor`). Cosmetic, so only a hint to start the owner's
 * reads early, never the answer: the profile read decides who is looking.
 * Read like every other reader of the cookie (`readDisplayUsername`).
 */
export async function looksLikeOwnProfile(username: string): Promise<boolean> {
  const shown = readDisplayUsername((await cookies()).toString());
  return shown?.toLowerCase() === username.toLowerCase();
}
