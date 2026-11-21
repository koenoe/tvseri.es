import {
  type CircleButtonSize,
  circleButtonStyles,
} from '@/components/ui/button/buttonStyles';
import { HIT_ALL } from '@/components/ui/button/hitArea';
import cn from '@/lib/cn';

/**
 * Key geometry of the big key, a row key and the panel. The look (fill, edge, press, latched, focus ring,
 * disabled) is the shared `remote-key` utility in globals.css. The phone sheet
 * sets `data-layout="sheet"` on the menu (`group/remote`).
 */

const SHEET = 'group-data-[layout=sheet]/remote:rounded-12';

/** A disabled key keeps the focus marker. */
const DISABLED_FOCUS =
  'aria-disabled:focus-visible:shadow-[inset_0_0_0_1px_var(--rk-line),0_0_0_2px_#fff,0_0_0_4px_var(--rk-mark)]';

export const BIG_KEY = cn(
  'remote-key flex h-22 w-full items-center gap-3 rounded-8 py-2 pr-8 pl-3 text-left',
  'group-data-[layout=sheet]/remote:h-26 group-data-[layout=sheet]/remote:p-3',
  SHEET,
  DISABLED_FOCUS,
);

export const SMALL_KEY = cn(
  'remote-key flex h-22 min-w-0 flex-col items-center justify-start gap-1.5 rounded-8 px-2 pt-4 pb-2.5 text-center',
  'group-data-[layout=sheet]/remote:h-26 group-data-[layout=sheet]/remote:pt-5.5 group-data-[layout=sheet]/remote:pb-3',
  SHEET,
  DISABLED_FOCUS,
);

/**
 * The letter chip on a key (white; light on a latched key; outlined when
 * disabled). Its 4px corner sits 4px in from the key's 8 (8px in from the
 * sheet's 12), so the corners stay concentric.
 */
export const KEY_CHIP = cn(
  'remote-chip absolute top-1 right-1 group-data-[layout=sheet]/remote:top-2 group-data-[layout=sheet]/remote:right-2',
  'in-aria-disabled:bg-transparent in-aria-disabled:text-rk-w40 in-aria-disabled:shadow-[inset_0_0_0_1px_var(--rk-line)]',
);

/**
 * A 44px target around a smaller ⋯ (the tile's 32px, the 40px), so the
 * circle can stay small on artwork. The `::after` starts inside the 2px
 * ring, so each reach counts 2 more. The 44 and 48px circles are their own.
 */
const HIT_AREA: Readonly<Record<CircleButtonSize, string>> = {
  32: HIT_ALL[8],
  40: HIT_ALL[4],
  44: '',
  48: '',
};

/**
 * The ⋯ that opens a Remote: the shared outline circle (white/20 ring, no
 * fill), white once open (and while a first press waits for the Remote's
 * code, `aria-busy`), like the icon buttons beside it (no
 * dark fill). A soft shadow under the glyph keeps it readable on a bright
 * still; on the page colour it doesn't show.
 */
export function remoteTriggerStyles(
  size: CircleButtonSize,
  className?: string,
) {
  return circleButtonStyles({
    className: cn(
      'aria-expanded:border-white aria-expanded:text-white aria-busy:border-white aria-busy:text-white [&>svg]:drop-shadow-[0_1px_2px_rgb(0_0_0/0.55)]',
      HIT_AREA[size],
      className,
    ),
    size,
  });
}
