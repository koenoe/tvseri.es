import type { ReactNode } from 'react';

import cn from '@/lib/cn';
import { type AppBrand, brandOf } from '../../_lib/services';
import type { AppSurface } from '../_lib/appState';

/** A header pill's box (the placeholder draws the same) */
export const APP_PILL_CLASS =
  'inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-caption font-medium';

/**
 * A state pill's fill and words fade to the new state's (200ms); the words
 * fade in on their own (`@starting-style`), keyed by the state
 */
const CHANGES = 'transition-[background-color,color,box-shadow] duration-200';
const WORDS = 'transition-opacity duration-200 ease-out starting:opacity-0';

/** A plain fact */
const QUIET = 'text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)]';

const VARIANT: Readonly<Record<Exclude<AppPillVariant, 'connected'>, string>> =
  {
    available: 'bg-white/10 text-white',
    quiet: QUIET,
    // grey, its words still legible
    unavailable:
      'bg-white/6 text-white/60 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]',
  };

/** The state pill in its card's surface, or `quiet` for a plain fact */
export type AppPillVariant = AppSurface | 'quiet';

/** A card header pill: the state pill, or a `quiet` fact (Built in, Needs Plex Pass) */
export default function AppPill({
  brand,
  children,
  variant = 'quiet',
}: Readonly<{
  brand: AppBrand;
  children: ReactNode;
  variant?: AppPillVariant;
}>) {
  const classes = cn(
    APP_PILL_CLASS,
    CHANGES,
    variant === 'connected' ? brandOf(brand).pill : VARIANT[variant],
  );
  return (
    <span className={classes}>
      <span className={WORDS} key={variant}>
        {children}
      </span>
    </span>
  );
}
