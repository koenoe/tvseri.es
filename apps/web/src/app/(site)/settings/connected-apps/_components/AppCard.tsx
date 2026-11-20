import type { ReactNode } from 'react';
import { TINT_FADE } from '@/components/motion/swap';
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

/** The surfaces sit behind the card's content, on its own stacking context */
const CARD = cn(APP_CARD_CLASS, 'relative isolate');
const LAYER = 'pointer-events-none absolute inset-0 -z-10 rounded-[inherit]';

/**
 * The connected panel fades in over the available one (360ms), on the
 * card's arrival too, after its header; it is opaque, so the brand edge
 * below shows again only as it drains.
 */
const TINT = cn(LAYER, TINT_FADE, 'starting:opacity-0');

/**
 * One app's card. Colour means live: a connected card is a brand-tinted
 * panel, an available one is neutral with a 2px edge in its brand colour.
 * Each is a layer of its own, so the colour fades in and out instead of
 * switching.
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
  const look = brandOf(brand);
  const ground = cn(
    LAYER,
    surface === 'unavailable' ? UNAVAILABLE : ['bg-white/3.5', look.available],
  );
  const tint = cn(
    TINT,
    look.connected,
    surface === 'connected' ? 'opacity-100' : 'opacity-0',
  );
  return (
    <div className={CARD}>
      <span aria-hidden="true" className={ground} />
      <span aria-hidden="true" className={tint} />
      {children}
    </div>
  );
}
