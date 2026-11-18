import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { checkGlyph, warningGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import ToastCard, { type ToastAction } from './ToastCard';
import { setToastShowing } from './toastShowing';

export type ToastOptions = Readonly<{
  /** The filled button: Undo, Try again. */
  action?: ToastAction;
  /** Milliseconds, paused while hovered or focused. Default 6000. */
  duration?: number;
  /**
   * The icon in the disc (drawn at 15px). Default: ✓ (done), or ⚠ for
   * `tone: 'error'`.
   * Marks pass the filled eye.
   */
  icon?: ReactNode;
  /**
   * Reuse an id to update the toast that is showing (a merged mark: "Marked
   * S03E05–S03E07"); its timer starts over. A different id replaces it.
   */
  id?: number | string;
  /** The quiet button before the action: “Use release dates”. */
  secondaryAction?: ToastAction;
  /**
   * One line where it fits, two on a phone; past that cut, with the full text
   * on hover.
   */
  title: string;
  /** Errors and warnings use the same dark toast with a bare warning icon. */
  tone?: 'default' | 'error';
}>;

const DEFAULT_DURATION = 6000;

let current: number | string | undefined;
let version = 0;
let created = 0;

const forget = (id: number | string) => () => {
  if (current === id) {
    current = undefined;
    setToastShowing(false);
  }
};

/**
 * Shows the one toast (one at a time, replaced not stacked, Undo + at most
 * one more action). Returns the id, so a caller can merge
 * the next mark into it.
 *
 * @example
 * const id = showToast({ title: 'Marked S03E05 · Just now', icon: <Icon glyph={eyeGlyph} active size={16} />, action: { label: 'Undo', onClick: undo } });
 * showToast({ id, title: 'Marked S03E05–S03E07 · Just now', action: { label: 'Undo', onClick: undoAll } });
 */
export function showToast({
  action,
  duration = DEFAULT_DURATION,
  icon,
  id,
  secondaryAction,
  title,
  tone = 'default',
}: ToastOptions): number | string {
  created += 1;
  const toastId = id ?? `toast-${created}`;
  if (current !== undefined && current !== toastId) {
    toast.dismiss(current);
  }
  current = toastId;
  setToastShowing(true);
  version += 1;
  const shownVersion = version;
  const toneGlyph = tone === 'error' ? warningGlyph : checkGlyph;
  const disc = icon ?? <Icon glyph={toneGlyph} size={16} />;

  toast.custom(
    (sonnerId) => (
      <ToastCard
        action={action}
        duration={duration}
        icon={disc}
        secondaryAction={secondaryAction}
        title={title}
        toastId={sonnerId}
        tone={tone}
        version={shownVersion}
      />
    ),
    {
      // ToastCard runs the timer (sonner's doesn't pause on focus).
      duration: Number.POSITIVE_INFINITY,
      id: toastId,
      onAutoClose: forget(toastId),
      onDismiss: forget(toastId),
    },
  );
  return toastId;
}
