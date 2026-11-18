import type { MouseEvent } from 'react';

import type { SetState } from './chips';
import { markChipClass } from './MarkChip';
import SheetToggle from './SheetToggle';

/**
 * The phone "Season" chip as it renders: plain and outlined, white
 * text, no progress fill and no eye; `aria-pressed` carries complete.
 */
const PHONE = 'bg-transparent text-white sm:hidden';

/**
 * Mark season / Unmark season: a small pill on desktop, a "Season" chip on
 * phones. One rule: marks what's
 * open Just now, unmarks all when complete.
 */
export default function SeasonToggles({
  disabled,
  label,
  onToggle,
  state,
}: Readonly<{
  label: string;
  state: SetState;
  disabled: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
}>) {
  const complete = state === 'w';
  const aria = complete
    ? `Unmark ${label}`
    : `Mark ${label} watched (just now)`;
  const phoneClass = markChipClass('', undefined, PHONE);
  const blocked = disabled || undefined;
  return (
    <>
      <SheetToggle
        aria-disabled={blocked}
        aria-label={aria}
        className="max-sm:hidden"
        onClick={disabled ? undefined : onToggle}
        pressed={complete}
        size="sm"
        title={aria}
      >
        {complete ? 'Unmark season' : 'Mark season'}
      </SheetToggle>
      <button
        aria-disabled={blocked}
        aria-label={aria}
        aria-pressed={complete}
        className={phoneClass}
        onClick={disabled ? undefined : onToggle}
        title={aria}
        type="button"
      >
        <span>Season</span>
      </button>
    </>
  );
}
