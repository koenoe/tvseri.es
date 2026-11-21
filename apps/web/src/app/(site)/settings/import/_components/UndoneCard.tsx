import Button from '@/components/ui/button/Button';
import { historyGlyph } from '@/components/ui/icon/glyphs';

const HEAD = 'Import undone';
const LINE =
  'Everything it added is gone. Episodes you had marked before are untouched.';

/** The card's words, said once by the region */
const SPOKEN = `${HEAD}. ${LINE}`;

/**
 * "Import undone" for screen readers. Mounted, empty, before the card and
 * kept outside its swap: a region that mounts with its text often goes
 * unannounced. Out of the flow, so it takes no gap.
 */
export function UndoneStatus({ undone }: Readonly<{ undone: boolean }>) {
  const spoken = undone ? SPOKEN : '';
  return (
    <span className="sr-only" role="status">
      {spoken}
    </span>
  );
}

/**
 * It replaces the Undo import (Undoing…) button that had the focus, which
 * would fall to the page: Start again takes it, or the card itself where it
 * has none. Focus moved elsewhere while the undo ran stays there.
 */
const takeLostFocus = (card: HTMLDivElement | null) => {
  if (!card || document.activeElement !== document.body) {
    return;
  }
  (card.querySelector('button') ?? card).focus({ preventScroll: true });
};

/**
 * After Undo import. Without `onStartAgain` (the
 * Upload step, where the drop zone is right there) it has no button.
 * Screen readers hear it from `UndoneStatus`.
 */
export default function UndoneCard({
  onStartAgain,
}: Readonly<{ onStartAgain?: () => void }>) {
  // Focusable only to hold the focus when there's no Start again
  const tabIndex = onStartAgain ? undefined : -1;
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-16 bg-white/4 p-8 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
      ref={takeLostFocus}
      tabIndex={tabIndex}
    >
      <b className="text-title-3">{HEAD}</b>
      <span className="text-body-sm text-white/60">{LINE}</span>
      {onStartAgain ? (
        <Button icon={historyGlyph} onClick={onStartAgain} variant="tonal">
          Start again
        </Button>
      ) : null}
    </div>
  );
}
