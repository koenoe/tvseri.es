import { CROSSFADE } from '@/components/motion/lateFade';
import ExpandChevron from '@/components/ui/icon/ExpandChevron';
import type { IconSize } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

/** Both words in one grid cell (one width), swapping as two layers (`CROSSFADE`) */
const WORD = cn('col-start-1 row-start-1', CROSSFADE);
const HIDDEN = cn(WORD, 'invisible opacity-0');

type Words = Readonly<{
  /** the folded label: "Show all 22" */
  label: string;
  open: boolean;
  /** the open label: "Show fewer" unless the place says otherwise ("Hide") */
  openLabel?: string;
}>;

/**
 * A fold's two labels in one grid cell, so the control keeps its width when
 * it flips: the leaving word fades out while the new one fades in, both in
 * 150ms (`CROSSFADE`), and only the shown one is read out.
 * For a control with its own icon (Edit / Hide columns); with the turning
 * chevron, `FoldLabel`.
 */
export function FoldWords({ label, open, openLabel = 'Show fewer' }: Words) {
  return (
    <span className="grid">
      <span aria-hidden={open || undefined} className={open ? HIDDEN : WORD}>
        {label}
      </span>
      <span aria-hidden={!open || undefined} className={open ? WORD : HIDDEN}>
        {openLabel}
      </span>
    </span>
  );
}

/**
 * The inside of every Show all / Show fewer button (one button in both
 * states): the two labels (`FoldWords`), then the chevron that turns. The
 * button itself (its frame, `aria-expanded`, the click) is the caller's.
 */
export default function FoldLabel({
  size,
  ...words
}: Words & Readonly<{ size: IconSize }>) {
  return (
    <>
      <FoldWords {...words} />
      <ExpandChevron open={words.open} size={size} />
    </>
  );
}
