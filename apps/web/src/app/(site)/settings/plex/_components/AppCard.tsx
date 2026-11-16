import type { ReactNode } from 'react';

import cn from '@/lib/cn';

export type AppBrand = 'emby' | 'jellyfin' | 'plex';

/** Available: neutral, a 2px brand top edge. */
const AVAILABLE: Readonly<Record<AppBrand, string>> = {
  emby: 'shadow-[inset_0_2px_0_rgb(76_175_80),inset_0_0_0_1px_rgb(255_255_255/0.07)]',
  jellyfin:
    'shadow-[inset_0_2px_0_rgb(120_130_220),inset_0_0_0_1px_rgb(255_255_255/0.07)]',
  plex: 'shadow-[inset_0_2px_0_#e5a00d,inset_0_0_0_1px_rgb(255_255_255/0.07)]',
};

/** Connected: a brand-tinted panel (`.sg-app.live`). Plex is the only one. */
const CONNECTED =
  'bg-[#1f2425] bg-[linear-gradient(180deg,rgb(229_160_13/0.24)_0%,rgb(229_160_13/0.14)_28%,rgb(229_160_13/0.12)_100%)] shadow-[inset_0_0_0_1px_rgb(229_160_13/0.35)]';

/** The card's box (the placeholder draws the same) */
export const APP_CARD_CLASS = 'flex flex-col overflow-hidden rounded-[20px]';

/**
 * One connector's card: colour means live (settings_build_spec §5). A
 * connected card is a brand-tinted panel; every other one is neutral with a
 * 2px edge in its brand colour.
 */
export default function AppCard({
  brand,
  children,
  connected = false,
}: Readonly<{
  brand: AppBrand;
  children: ReactNode;
  connected?: boolean;
}>) {
  const classes = cn(
    APP_CARD_CLASS,
    connected ? CONNECTED : ['bg-white/3.5', AVAILABLE[brand]],
  );
  return <div className={classes}>{children}</div>;
}
