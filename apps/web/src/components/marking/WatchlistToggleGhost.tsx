import type { ButtonSize } from '@/components/ui/button/buttonStyles';
import { ButtonFace } from '@/components/ui/ghost/ghosts';
import { plusGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';

import { ROW } from './markControlStyles';
import ToggleSizers from './ToggleSizers';

/**
 * The watchlist toggle's ghost: one flat pill filling the toggle's box (the
 * wider of its two faces). Its block pulses it (`PULSE`), or `className`
 * does where the ghost is alone.
 */
export default function WatchlistToggleGhost({
  className,
  label = 'Watchlist',
  size = 'sm',
}: Readonly<{ className?: string; label?: string; size?: ButtonSize }>) {
  const row = cn(ROW, className);
  return (
    <span className={row}>
      <ToggleSizers label={label} size={size} />
      <ButtonFace className="w-full" icon={plusGlyph} size={size}>
        {label}
      </ButtonFace>
    </span>
  );
}
