import cn from '@/lib/cn';

/**
 * The sheet's ground: the white Remote (`light`) or every dark sheet. The
 * bar is as quiet on either: black at 18% on white, white at 18% on dark.
 */
export type SheetTone = 'dark' | 'light';

const TONE: Readonly<Record<SheetTone, string>> = {
  dark: 'bg-white/18',
  light: 'bg-black/18',
};

/**
 * The grab handle (36 × 5) atop a phone bottom sheet: it says the sheet
 * swipes down to close. Decorative (`aria-hidden`); the swipe itself is the
 * shell's (`useSheetSwipe`), and a press on the bar starts it like anywhere
 * else on the sheet. Only for sheets that sit at the bottom, never for a
 * full-screen panel. `className` places it in its sheet.
 */
export default function SheetHandle({
  className,
  tone = 'dark',
}: Readonly<{ className?: string; tone?: SheetTone }>) {
  const classes = cn(
    'block h-1.25 w-9 shrink-0 rounded-full',
    TONE[tone],
    className,
  );
  return <span aria-hidden className={classes} data-sheet-handle="" />;
}
