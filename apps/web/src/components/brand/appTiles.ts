import type { ConnectionService } from '@tvseri.es/schemas';
import type { ComponentType } from 'react';

import BbcIplayerLogo from './logos/BbcIplayerLogo';
import NetflixLogo from './logos/NetflixLogo';
import PlexLogo from './logos/PlexLogo';
import PrimeVideoLogo from './logos/PrimeVideoLogo';

/** An app tvseri.es connects to: Plex's webhook or a streaming service */
export type AppBrand = 'plex' | ConnectionService;

/** Full class strings, so Tailwind sees each one */
export type AppTileLook = Readonly<{
  Logo: ComponentType<Readonly<{ className: string }>>;
  tile: Readonly<{ glyph: string; ground: string }>;
}>;

export const APP_TILES: Readonly<Record<AppBrand, AppTileLook>> = {
  bbc: {
    Logo: BbcIplayerLogo,
    tile: { glyph: 'size-7 text-iplayer md:size-9', ground: 'bg-[#141414]' },
  },
  netflix: {
    Logo: NetflixLogo,
    tile: { glyph: 'size-7 text-netflix md:size-9', ground: 'bg-[#141414]' },
  },
  // Wordmarks are wide, so they're sized by width
  plex: {
    Logo: PlexLogo,
    tile: { glyph: 'h-auto w-9 md:w-11', ground: 'bg-[#282a2d]' },
  },
  prime: {
    Logo: PrimeVideoLogo,
    tile: { glyph: 'h-auto w-9 text-prime md:w-11', ground: 'bg-[#0f171e]' },
  },
};
