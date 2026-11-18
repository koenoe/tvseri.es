'use client';

import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { closeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import useToastTimer from './useToastTimer';

export type ToastAction = Readonly<{ label: string; onClick: () => void }>;

const ACTION =
  'h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-8 px-3 text-caption font-medium transition-colors hover:bg-white/18';
const QUIET_ACTION = `${ACTION} text-white/80`;
const FILLED_ACTION = `${ACTION} bg-white/10`;

/**
 * As wide as its content: 280px at least, the toaster's `--width` (720) at
 * most, where a long message wraps to its second line. Phones: full width.
 */
const CARD =
  'flex min-h-13 w-max min-w-70 max-w-[min(var(--width),calc(100vw-32px))] items-center gap-3 rounded-14 bg-[color-mix(in_srgb,var(--color-page)_50%,black)] py-1.5 pr-2 pl-3.5 text-white shadow-[0_20px_40px_-12px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.09)] max-[600px]:w-full';
/** Phones, two actions: a second line for them under the message */
const CARD_STACKS =
  'max-[600px]:flex-wrap max-[600px]:gap-y-1 max-[600px]:pb-2';
/** the glyph is 15px at white/65 in a disc, whoever passes it */
const ICON_DISC =
  'flex size-5.5 shrink-0 items-center justify-center rounded-full bg-white/16 text-white/65 [&_svg]:size-[15px]';
/** A warning stands on its own: the triangle in a disc reads as two shapes */
const ICON_BARE =
  'flex size-5.5 shrink-0 items-center justify-center text-white/80 [&_svg]:size-[18px]';
/** 24px after the message: the buttons read as a group apart from it */
const ACTIONS = 'ml-3 flex shrink-0 items-center gap-3';
const ACTIONS_STACKED =
  'max-[600px]:order-last max-[600px]:basis-full max-[600px]:justify-end';

/**
 * The dark toast: a 22px icon disc (a warning has no disc), the message (one
 * line where it fits, the 52px toast; a second line on a phone rather than
 * losing its point; the full text on hover past two), at most one quiet
 * action, the filled action (Undo) and ✕. Sonner leaves custom toasts
 * unsized: the card sizes itself (`CARD`) and sonner's list item, placed on
 * the toaster's right edge, wraps it.
 *
 * On a phone a toast with two actions stacks: the message keeps the first
 * line beside the icon and ✕, the actions sit under it on the right (the
 * message is the point of a toast, and two actions beside it leave it no
 * room at 360).
 */
export default function ToastCard({
  action,
  duration,
  icon,
  secondaryAction,
  title,
  toastId,
  tone,
  version,
}: Readonly<{
  action?: ToastAction;
  duration: number;
  icon: ReactNode;
  secondaryAction?: ToastAction;
  title: string;
  toastId: number | string;
  tone: 'default' | 'error';
  /** Bumped on every update with the same id: the timer starts over. */
  version: number;
}>) {
  const pauseHandlers = useToastTimer({ duration, toastId, version });
  const dismiss = () => toast.dismiss(toastId);
  const run = (chosen: ToastAction) => () => {
    chosen.onClick();
    dismiss();
  };
  const runSecondary = secondaryAction ? run(secondaryAction) : undefined;
  const runAction = action ? run(action) : undefined;

  const stacks = Boolean(secondaryAction && action);
  const card = cn(CARD, stacks && CARD_STACKS);
  const actions = cn(ACTIONS, stacks && ACTIONS_STACKED);
  const iconClasses = tone === 'error' ? ICON_BARE : ICON_DISC;
  return (
    <div className={card} {...pauseHandlers}>
      <span className={iconClasses}>{icon}</span>
      <p
        className="line-clamp-2 min-w-0 flex-1 text-body-sm font-medium max-[600px]:leading-5"
        title={title}
      >
        {title}
      </p>
      {secondaryAction || action ? (
        <div className={actions}>
          {secondaryAction ? (
            <button
              className={QUIET_ACTION}
              onClick={runSecondary}
              type="button"
            >
              {secondaryAction.label}
            </button>
          ) : null}
          {action ? (
            <button className={FILLED_ACTION} onClick={runAction} type="button">
              {action.label}
            </button>
          ) : null}
        </div>
      ) : null}
      <button
        aria-label="Dismiss"
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-8 text-white/60 transition-colors hover:text-white"
        onClick={dismiss}
        type="button"
      >
        {/* a 14px × */}
        <Icon className="size-3.5" glyph={closeGlyph} size={13} />
      </button>
    </div>
  );
}
