import { useCallback, useLayoutEffect, useRef } from 'react';

import { checkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MarkSwap from '@/components/ui/icon/MarkSwap';

import type { Fix } from './fix';
import { focusPastItem } from './itemFocus';
import { LINK } from './styles';

/** A dash: "Skipped" (no shared glyph draws it). */
function Minus() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={13}
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={13}
    >
      <path d="M5 12h14" />
    </svg>
  );
}

const labelOf = (fix: Fix) =>
  fix.kind === 'skipped'
    ? 'Skipped'
    : fix.status === 'failed'
      ? `Couldn’t import as ${fix.label}`
      : `Imported as ${fix.label}`;

/**
 * A pick that couldn't be imported, for screen readers: "Top Boy:
 * Couldn’t import as Top Boy (2019)". A pick or a skip is said by its
 * toast, and the failure's toast doesn't say which item. Mounted, empty,
 * with the item and kept outside its swap: a region that mounts with its
 * text often goes unannounced. Out of the flow, so it takes no gap.
 */
export function FixStatus({
  fix,
  title,
}: Readonly<{ fix: Fix | undefined; title: string }>) {
  const spoken =
    fix?.kind === 'picked' && fix.status === 'failed'
      ? `${title}: ${labelOf(fix)}`
      : '';
  return (
    <span className="sr-only" role="status">
      {spoken}
    </span>
  );
}

/**
 * Undo leaves by itself once the pick is sent: focus it held would fall to
 * the page, so it goes on past the item (`focusPastItem`). Pressed, Undo
 * leaves with the whole line instead, and `keepFocusInItem` has it.
 */
function useFocusPastWhenGone(shown: boolean) {
  const line = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  // Before the node leaves the page: is it the one with focus?
  const control = useCallback((node: HTMLButtonElement | null) => {
    if (!node) {
      return;
    }
    return () => {
      held.current = document.activeElement === node;
    };
  }, []);
  // A change while it renders, not an event: only an effect sees it go
  useLayoutEffect(() => {
    if (shown || !held.current) {
      return;
    }
    held.current = false;
    if (line.current) {
      focusPastItem(line.current);
    }
  }, [shown]);
  return { control, line };
}

/**
 * An item once it's sorted out: "✓ Imported as Top Boy
 * (2019)" or "– Skipped", with Undo while it can still be undone (a skip
 * always; a pick until it's sent). Screen readers hear it from its toast,
 * or `FixStatus`.
 */
export default function FixDone({
  fix,
  onUndo,
}: Readonly<{ fix: Fix; onUndo: () => void }>) {
  const canUndo = fix.kind === 'skipped' || fix.status === 'waiting';
  const failed = fix.kind === 'picked' && fix.status === 'failed';
  const hasAction = canUndo || failed;
  const { control, line } = useFocusPastWhenGone(hasAction);
  const label = labelOf(fix);
  return (
    <div
      className="flex items-center gap-2 text-meta leading-5 text-white/80"
      ref={line}
    >
      <MarkSwap swapKey={fix.kind}>
        {fix.kind === 'skipped' ? (
          <Minus />
        ) : (
          <Icon glyph={checkGlyph} size={13} />
        )}
      </MarkSwap>
      {label}
      {hasAction ? (
        <button className={LINK} onClick={onUndo} ref={control} type="button">
          {failed ? 'Try again' : 'Undo'}
        </button>
      ) : null}
    </div>
  );
}
