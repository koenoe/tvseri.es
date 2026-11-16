'use client';

import { showToast } from '@/components/ui/toast/showToast';

import { SIGN_IN_MESSAGE } from './copy';

/** Marking toasts share one id: a new one replaces the last. */
export const MARKING_TOAST_ID = 'marking';

/**
 * The signed-out prompt every marking control shows (the dark toast with the
 * warning icon and a Sign in action back to this page). Use it for any personal action a
 * signed-out visitor tries (a `+`, a heart), so the copy stays one.
 */
export default function promptSignIn() {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  showToast({
    action: {
      label: 'Sign in',
      onClick: () =>
        window.location.assign(
          `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`,
        ),
    },
    id: MARKING_TOAST_ID,
    title: SIGN_IN_MESSAGE,
    tone: 'error',
  });
}
