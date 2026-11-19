import { APP_TILES } from '@/components/brand/appTiles';
import type { ConnectedService } from './types';

export const NETFLIX: ConnectedService = {
  ...APP_TILES.netflix,
  available:
    'shadow-[inset_0_2px_0_var(--color-netflix),inset_0_0_0_1px_rgb(255_255_255/0.07)]',
  connected:
    'bg-[#241618] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-netflix)_20%,transparent)_0%,color-mix(in_srgb,var(--color-netflix)_12%,transparent)_28%,color-mix(in_srgb,var(--color-netflix)_10%,transparent)_100%)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-netflix)_30%,transparent)]',
  copy: {
    activityHeading: 'Last watched',
    profileTitle: 'Netflix profile',
    reconnect:
      'Netflix signed this browser out, so your history has stopped syncing. On netflix.com, sign in and switch to your profile, then connect again.',
    signedOutStatus: 'Netflix signed you out · reconnect',
    // The profile comes first, as the link takes whichever is active
    steps: [
      'Add the tvseri.es extension to Chrome on a computer where you’re signed in to Netflix.',
      'On netflix.com, switch to the profile whose history you want here.',
      'Press Connect and confirm in the extension.',
      'Your watched episodes sync from Netflix and show up here.',
    ],
    syncFailed: {
      changed:
        'Netflix changed its history page, so the sync stopped. Nothing to do on your side: it picks up once that’s fixed.',
      'profile-changed':
        'Netflix is on a different profile than the one you connected, so the sync stopped rather than mix in someone else’s viewing. Switch back to it on netflix.com, or connect again from the profile you want.',
      // Shown after the third refusal; the run's checkpoint stays for the next
      'rate-limited':
        'Netflix is busy or limiting reads for now, so the sync paused. The next one picks up where it stopped.',
      'signed-out':
        'Netflix signed this connection out. Connect again through the extension.',
    },
    syncRunning: 'Syncing your Netflix history now…',
    unavailable:
      'Netflix connects through the tvseri.es extension for Chrome on a computer.',
  },
  dot: 'rounded-full bg-netflix',
  facts: ['Chrome extension'],
  hairline: 'border-netflix/18',
  id: 'netflix',
  name: 'Netflix',
  pill: 'bg-netflix text-white',
  site: 'netflix.com',
};
