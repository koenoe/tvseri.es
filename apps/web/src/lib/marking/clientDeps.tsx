'use client';

import { readDisplayUsername } from '@/components/menu/displayCookie';
import { eyeGlyph, skippedGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { showToast } from '@/components/ui/toast/showToast';

import { MARKING_TOAST_ID } from './promptSignIn';
import type { ToastInput } from './toasts';

/** The browser side of the deps `useMarking` and `useBulk` give their cores. */

const ICONS = {
  eye: <Icon active glyph={eyeGlyph} size={16} />,
  skipped: <Icon glyph={skippedGlyph} size={16} />,
} as const;

/** Signed in, from the display cookie (read at the moment of the press) */
export const isSignedInNow = () =>
  readDisplayUsername(document.cookie) !== null;

/**
 * A marking toast: in the marking slot (a new one replaces the last), an
 * error in its own.
 */
export function showMarkingToast({ icon, ...input }: ToastInput) {
  showToast({
    ...input,
    icon: icon ? ICONS[icon] : undefined,
    id: input.tone === 'error' ? undefined : MARKING_TOAST_ID,
  });
}
