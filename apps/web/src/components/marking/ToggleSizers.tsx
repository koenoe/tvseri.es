import type { ButtonSize } from '@/components/ui/button/buttonStyles';
import { ButtonFace } from '@/components/ui/ghost/ghosts';
import { plusGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';

/** The toggle's on label */
export const ON_LABEL = 'On watchlist';

/** 138 wide for the 36px toggle (the ticket's) */
const MIN_WIDTH: Partial<Record<ButtonSize, string>> = {
  sm: 'min-w-[138px]',
};

/**
 * The watchlist toggle's box: both of its faces laid out unseen in the
 * row's one cell, so the row is the wider of the two (at least
 * 138 × 36 for the 36px toggle) whichever shows, its ghost included
 */
export default function ToggleSizers({
  label,
  size,
}: Readonly<{ label: string; size: ButtonSize }>) {
  const onFace = cn('invisible', MIN_WIDTH[size]);
  return (
    <>
      <ButtonFace className="invisible" icon={plusGlyph} size={size}>
        {label}
      </ButtonFace>
      <ButtonFace className={onFace} icon={plusGlyph} size={size}>
        {ON_LABEL}
      </ButtonFace>
    </>
  );
}
