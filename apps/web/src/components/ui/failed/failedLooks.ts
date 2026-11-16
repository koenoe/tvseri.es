import type { IconSize } from '@/components/ui/icon/types';

/**
 * How a failed card is drawn in one place (`FailedCard`), a record each
 * place keeps with itself: its box, the column its title and line sit in
 * (none: they sit in the box), the title and the line under it (none: a
 * one-line card). Its Try again is a `TryAgainLook` (`TryAgain`).
 */
export type FailedLook = Readonly<{
  body?: string;
  box: string;
  text?: string;
  title: string;
}>;

/** The Try again button's classes and its refresh glyph's size */
export type TryAgainLook = Readonly<{ className: string; glyph: IconSize }>;
