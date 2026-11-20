import SwapIn from '@/components/motion/SwapIn';
import Button from '@/components/ui/button/Button';
import { HIT_Y } from '@/components/ui/button/hitArea';
import cn from '@/lib/cn';

import FixDone from './FixDone';
import { keepFocusInItem, showRestOfItems } from './itemFocus';
import { ProblemItemFrame } from './ProblemGroup';
import { LINK_BASE, SMALL_BUTTON } from './styles';

/**
 * Reaching 4px above and below, not 10: wrapped under Skip (8px apart), it
 * would overlap Skip's own reach
 */
const SHOW_LINK = cn(LINK_BASE, 'px-3', HIT_Y[4]);

/**
 * The rest of a group in one line ("153 more like these", "38 more
 * rows across 9 shows"): skip them all at once, or show them one by one.
 * "Skipped" rises into the buttons' place, as in the items above it; its
 * toast says so. Show them hands focus to the first item it shows.
 */
export default function RestItem({
  count,
  onShow,
  onSkip,
  onUndo,
  skipLabel,
  skipped,
  title,
  why,
}: Readonly<{
  count: string;
  onShow: () => void;
  onSkip: () => void;
  onUndo: () => void;
  skipLabel: string;
  skipped: number;
  title: string;
  why: string;
}>) {
  const skip = () => keepFocusInItem(onSkip);
  const undo = () => keepFocusInItem(onUndo);
  const show = () => showRestOfItems(onShow);
  const fix =
    skipped > 0 ? ({ kind: 'skipped', rows: skipped } as const) : undefined;
  return (
    <ProblemItemFrame count={count} title={title} why={why}>
      <SwapIn swapKey={fix ? 'done' : 'ask'}>
        {fix ? (
          <FixDone fix={fix} onUndo={undo} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className={SMALL_BUTTON}
              onClick={skip}
              size="xs"
              variant="quiet"
            >
              <span className="text-body-sm">{skipLabel}</span>
            </Button>
            <button className={SHOW_LINK} onClick={show} type="button">
              Show them
            </button>
          </div>
        )}
      </SwapIn>
    </ProblemItemFrame>
  );
}
