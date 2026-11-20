import ExpandChevron from '@/components/ui/icon/ExpandChevron';
import cn from '@/lib/cn';

/** Both words in one grid cell (one width), the leaving one faded out in 120ms */
const WORD =
  'col-start-1 row-start-1 transition-[opacity,visibility] duration-120';
const SHOWN = WORD;
const HIDDEN = cn(WORD, 'invisible opacity-0');

/**
 * The card toggle's inside: Open and Hide cross-fade in one width, then the
 * chevron that turns. At rest it draws as `FoldLabel` does (the ghost's
 * face), so the live toggle replaces it without a pixel moving.
 */
export default function ToggleLabel({ open }: Readonly<{ open: boolean }>) {
  return (
    <>
      <span className="grid">
        <span className={open ? HIDDEN : SHOWN}>Open</span>
        <span className={open ? SHOWN : HIDDEN}>Hide</span>
      </span>
      <ExpandChevron open={open} size={13} />
    </>
  );
}
