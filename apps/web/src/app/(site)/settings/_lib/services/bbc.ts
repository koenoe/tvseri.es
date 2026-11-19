import { APP_TILES } from '@/components/brand/appTiles';
import type { ConnectedService } from './types';

export const BBC_IPLAYER: ConnectedService = {
  ...APP_TILES.bbc,
  available:
    'shadow-[inset_0_2px_0_var(--color-iplayer),inset_0_0_0_1px_rgb(255_255_255/0.07)]',
  connected:
    'bg-[#24161d] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-iplayer)_20%,transparent)_0%,color-mix(in_srgb,var(--color-iplayer)_12%,transparent)_28%,color-mix(in_srgb,var(--color-iplayer)_10%,transparent)_100%)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-iplayer)_30%,transparent)]',
  copy: {
    activityHeading: 'Last watched',
    profileTitle: null,
    reconnect:
      'BBC iPlayer signed this browser out, so your viewing has stopped syncing. Sign in on bbc.co.uk/iplayer, then connect again.',
    signedOutStatus: 'BBC iPlayer signed you out · reconnect',
    // The sync reads the signed-in account's own viewing, whichever
    // profile is active, so there is no profile to pick first
    steps: [
      'Add the tvseri.es extension to Chrome on a computer where you’re signed in to BBC iPlayer.',
      'Press Connect and confirm in the extension.',
      'The first sync brings in your iPlayer history with the dates you watched. After that it syncs each night, and the episodes you finish show up here.',
    ],
    syncFailed: {
      changed:
        'BBC iPlayer changed how it lists your viewing, so the sync stopped. Nothing to do on your side: it picks up once that’s fixed.',
      'rate-limited':
        'BBC iPlayer is busy or limiting reads for now, so the sync paused. The next one picks up where it stopped.',
      'signed-out':
        'BBC iPlayer signed this connection out. Connect again through the extension.',
    },
    syncRunning: 'Syncing your BBC iPlayer viewing now…',
    unavailable:
      'BBC iPlayer connects through the tvseri.es extension for Chrome on a computer.',
  },
  dot: 'rounded-full bg-iplayer',
  facts: ['Chrome extension'],
  hairline: 'border-iplayer/18',
  id: 'bbc',
  name: 'BBC iPlayer',
  // White on iPlayer pink is under 4.5:1: dark text, as Plex's gold pill
  pill: 'bg-iplayer text-[#1f0612]',
  site: 'bbc.co.uk/iplayer',
};
