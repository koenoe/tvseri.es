'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { WELCOME_COOKIE_NAME } from '@/auth/cookies';
import { checkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { showToast } from '@/components/ui/toast/showToast';
import { expireCookie } from '@/lib/expireCookie';

const WELCOME = new RegExp(`(?:^|;\\s*)${WELCOME_COOKIE_NAME}=`);

/** Reads and deletes the auth callback's welcome cookie: true once */
function takeWelcome(): boolean {
  if (!WELCOME.test(document.cookie)) {
    return false;
  }
  expireCookie(WELCOME_COOKIE_NAME);
  return true;
}

const CHECK = <Icon className="text-cyan" glyph={checkGlyph} size={16} />;

/**
 * The one-time welcome after a sign-in that created the account (AU Final
 * states, “3 · first sign-in”): the site's toast, “Welcome” with “Pick a
 * username” (Settings → Profile; the board's wording). The
 * title is the short one so it never truncates beside the button and ✕ at
 * 360 (no wrapping). The callback sets the cookie; nothing is fetched.
 * Returning sign-ins get no toast: the header changing is the confirmation.
 *
 * It waits for the page to finish loading (the window's `load`: the
 * streamed document is complete, its holes filled), so its 6 s don't run
 * out over the skeletons of a slow first page. The cookie is read when it
 * shows: a page left before then passes the welcome on to the next one.
 */
export default function WelcomeToast() {
  const router = useRouter();
  // The cookie is client state and `load` a browser event: read them once,
  // after hydration (not a render input).
  useEffect(() => {
    const welcome = () => {
      if (!takeWelcome()) {
        return;
      }
      showToast({
        action: {
          label: 'Pick a username',
          onClick: () => router.push('/settings/profile'),
        },
        icon: CHECK,
        title: 'Welcome',
      });
    };
    if (document.readyState === 'complete') {
      welcome();
      return;
    }
    window.addEventListener('load', welcome, { once: true });
    return () => window.removeEventListener('load', welcome);
  }, [router]);
  return null;
}
