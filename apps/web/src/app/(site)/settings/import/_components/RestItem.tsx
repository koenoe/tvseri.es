import Button from '@/components/ui/button/Button';

import FixDone from './FixDone';
import { ProblemItemFrame } from './ProblemGroup';
import { LINK, SMALL_BUTTON } from './styles';

/**
 * The rest of a group in one line ("153 more like these", "38 more
 * rows across 9 shows"): skip them all at once, or show them one by one.
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
  return (
    <ProblemItemFrame count={count} title={title} why={why}>
      {skipped > 0 ? (
        <FixDone fix={{ kind: 'skipped', rows: skipped }} onUndo={onUndo} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className={SMALL_BUTTON}
            onClick={onSkip}
            size="xs"
            variant="quiet"
          >
            <span className="text-body-sm">{skipLabel}</span>
          </Button>
          <button className={`${LINK} px-3`} onClick={onShow} type="button">
            Show them
          </button>
        </div>
      )}
    </ProblemItemFrame>
  );
}
