import type { ReactNode } from 'react';

import cn from '@/lib/cn';
import { type AppBrand, brandOf } from '../../_lib/services';
import type { AppSurface } from '../_lib/appState';

/** A header pill's box (the placeholder draws the same) */
export const APP_PILL_CLASS =
  'inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-caption font-medium';

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
    variant === 'connected' ? brandOf(brand).pill : VARIANT[variant],
  );
  return <span className={classes}>{children}</span>;
}
