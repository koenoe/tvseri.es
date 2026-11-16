import ExpandChevron from '@/components/ui/icon/ExpandChevron';
import type { IconSize } from '@/components/ui/icon/types';

/**
 * The inside of every Show all / Show fewer button (one button in
 * both states): both labels share one grid cell, so
 * the button keeps its width when it flips, then the chevron that turns.
 * The button itself (its frame, `aria-expanded`, the click) is the caller's.
 */
export default function FoldLabel({
  label,
  open,
  size,
}: Readonly<{
  /** the folded label: "Show all 22" */
  label: string;
  open: boolean;
  size: IconSize;
}>) {
  const shown = open ? 'Show fewer' : label;
  const spare = open ? label : 'Show fewer';
  return (
    <>
      <span className="grid">
        <span className="col-start-1 row-start-1">{shown}</span>
        <span aria-hidden="true" className="invisible col-start-1 row-start-1">
          {spare}
        </span>
      </span>
      <ExpandChevron open={open} size={size} />
    </>
  );
}
