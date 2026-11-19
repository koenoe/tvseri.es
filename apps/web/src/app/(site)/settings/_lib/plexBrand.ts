import { APP_TILES } from '@/components/brand/appTiles';
import type { AppBrandLook } from './brand';

export const PLEX_BRAND: AppBrandLook = {
  ...APP_TILES.plex,
  available:
    'shadow-[inset_0_2px_0_var(--color-plex),inset_0_0_0_1px_rgb(255_255_255/0.07)]',
  connected:
    'bg-[#1f2425] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-plex)_24%,transparent)_0%,color-mix(in_srgb,var(--color-plex)_14%,transparent)_28%,color-mix(in_srgb,var(--color-plex)_12%,transparent)_100%)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-plex)_35%,transparent)]',
  dot: 'rounded-full bg-plex',
  facts: ['Built in', 'Needs Plex Pass'],
  hairline: 'border-plex/18',
  name: 'Plex',
  pill: 'bg-plex text-[#1d1400]',
};
