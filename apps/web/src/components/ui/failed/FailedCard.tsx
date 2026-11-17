import type { AriaRole, ReactNode } from 'react';

import pendingClick from '@/components/ui/button/pendingClick';
import { refreshGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import type { FailedLook, TryAgainLook } from './failedLooks';

type Props = Readonly<{
  /** the place's own control after the text (its Try again), if it has one */
  action?: ReactNode;
  /** `aria-busy` on the card, where the place sets it there */
  'aria-busy'?: boolean;
  /** the line under the title; none in a one-line card */
  body?: string;
  /** the place's own box classes on top of its look (the space it holds) */
  className?: string;
  look: FailedLook;
  /** the mark before the text: the place's glyph, bare or on a disc */
  mark: ReactNode;
  /** how the card is announced: `alert` when it fails, `status` while it retries or once settled */
  role?: AriaRole;
  title: string;
}>;

/**
 * The card that says a part of a page didn't load: a mark, the title, a
 * line, and the place's own control. It only draws: what it says, how it
 * is announced and what Try again does come from the place, which keeps
 * its own error boundary, retry and the frame around the card. `look` is
 * the place's drawing (`failedLooks`).
 */
export default function FailedCard({
  action,
  'aria-busy': busy,
  body,
  className,
  look,
  mark,
  role,
  title,
}: Props) {
  const classes = className ? cn(look.box, className) : look.box;
  const lines = (
    <>
      <p className={look.title}>{title}</p>
      {body === undefined ? null : <p className={look.body}>{body}</p>}
    </>
  );
  return (
    <div aria-busy={busy} className={classes} role={role}>
      {mark}
      {look.text === undefined ? (
        lines
      ) : (
        <div className={look.text}>{lines}</div>
      )}
      {action}
    </div>
  );
}

const IDLE = 'Try again';
const RETRYING = 'Loading…';

/** A retry in flight, the same in every place: dimmed and not pressable */
const PENDING = 'aria-disabled:cursor-progress aria-disabled:opacity-50';

/**
 * A failed card's Try again: the refresh glyph and its label. It only
 * draws; the place passes what a press does (`onClick`: re-run its error
 * boundary, refresh the route) and whether that retry is in flight
 * (`pending`). While it is, the button stays where it is, says "Loading…"
 * with the glyph turning, dimmed, and ignores presses (`aria-disabled`, so
 * it keeps focus, as every busy `Button`); it is as wide
 * as its longer label either way, so nothing moves.
 */
export function TryAgain({
  look,
  onClick,
  pending = false,
}: Readonly<{
  look: TryAgainLook;
  onClick?: () => void;
  pending?: boolean;
}>) {
  const classes = cn(look.className, PENDING);
  const handleClick = pendingClick(pending, onClick);
  const glyph = pending ? 'animate-spin' : undefined;
  const shown = pending ? RETRYING : IDLE;
  const hidden = pending ? IDLE : RETRYING;
  return (
    <button
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      className={classes}
      onClick={handleClick}
      type="button"
    >
      <Icon className={glyph} glyph={refreshGlyph} size={look.glyph} />
      <span className="grid justify-items-center">
        <span className="col-start-1 row-start-1">{shown}</span>
        <span aria-hidden className="invisible col-start-1 row-start-1">
          {hidden}
        </span>
      </span>
    </button>
  );
}
