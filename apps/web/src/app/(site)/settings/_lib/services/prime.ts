import { APP_TILES } from '@/components/brand/appTiles';
import type { ConnectedService } from './types';

export const PRIME_VIDEO: ConnectedService = {
  ...APP_TILES.prime,
  available:
    'shadow-[inset_0_2px_0_var(--color-prime),inset_0_0_0_1px_rgb(255_255_255/0.07)]',
  connected:
    'bg-[#141d22] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-prime)_20%,transparent)_0%,color-mix(in_srgb,var(--color-prime)_12%,transparent)_28%,color-mix(in_srgb,var(--color-prime)_10%,transparent)_100%)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-prime)_30%,transparent)]',
  copy: {
    activityHeading: 'Last watched',
    profileTitle: 'Prime Video profile',
    reconnect:
      'Prime Video signed this browser out, so your history has stopped syncing. On primevideo.com, sign in and switch to your profile, then connect again.',
    signedOutStatus: 'Prime Video signed you out · reconnect',
    // The profile comes first, as the link takes whichever is active
    steps: [
      'Add the tvseri.es extension to Chrome on a computer where you’re signed in to Prime Video.',
      'On primevideo.com, switch to the profile whose history you want here.',
      'Press Connect and confirm in the extension.',
      'Your watched episodes sync from Prime Video and show up here.',
    ],
    syncFailed: {
      changed:
        'Prime Video changed its history page, so the sync stopped. Nothing to do on your side: it picks up once that’s fixed.',
      'profile-changed':
        'Prime Video is on a different profile than the one you connected, so the sync stopped rather than mix in someone else’s viewing. Switch back to it on primevideo.com, or connect again from the profile you want.',
      'rate-limited':
        'Prime Video is busy or limiting reads for now, so the sync paused. The next one picks up where it stopped.',
      'signed-out':
        'Prime Video signed this connection out. Connect again through the extension.',
    },
    syncRunning: 'Syncing your Prime Video history now…',
    unavailable:
      'Prime Video connects through the tvseri.es extension for Chrome on a computer.',
  },
  dot: 'rounded-full bg-prime',
  facts: ['Chrome extension'],
  hairline: 'border-prime/18',
  id: 'prime',
  name: 'Prime Video',
  // White on Prime blue is under 4.5:1: dark text, as Plex's gold pill
  pill: 'bg-prime text-[#00141c]',
  site: 'primevideo.com',
};
