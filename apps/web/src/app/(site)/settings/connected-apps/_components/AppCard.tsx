import type { ReactNode } from 'react';

import cn from '@/lib/cn';
import { type AppBrand, brandOf } from '../../_lib/services';
import type { AppSurface } from '../_lib/appState';

/**
 * Unavailable: this browser can't connect the app. A dimmer ground and a
 * hairline, no brand edge: nothing here is on offer. The copy keeps its
 * colours, so it still reads at full contrast.
 */
const UNAVAILABLE = 'bg-white/2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.05)]';

/** The card's box (the placeholder draws the same) */
export const APP_CARD_CLASS = 'flex flex-col overflow-hidden rounded-[20px]';

const surfaceClass = (brand: AppBrand, surface: AppSurface) => {
  if (surface === 'connected') {
    return brandOf(brand).connected;
  }
  return surface === 'unavailable'
    ? UNAVAILABLE
    : ['bg-white/3.5', brandOf(brand).available];
};

/**
 * One app's card. Colour means live: a connected card is a brand-tinted
 * panel, an available one is neutral with a 2px edge in its brand colour.
 */
export default function AppCard({
  brand,
  children,
  surface,
}: Readonly<{
  brand: AppBrand;
  children: ReactNode;
  surface: AppSurface;
}>) {
  const classes = cn(APP_CARD_CLASS, surfaceClass(brand, surface));
  return <div className={classes}>{children}</div>;
}
