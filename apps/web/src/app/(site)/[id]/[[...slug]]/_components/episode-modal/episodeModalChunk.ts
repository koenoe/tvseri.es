import { createLoader } from '@/lib/lazy/createLoader';

/**
 * The modal is its own chunk (a plain loader, not `next/dynamic`: a failed
 * chunk is tried again on the next open; ~18 KB gzip): it isn't part of the
 * page's first load, and is fetched once the browser is idle, so the first
 * open doesn't wait for it (measured: ~320ms cold vs ~20ms warm). A small
 * module of its own, so a tile can warm it without loading the island.
 */
export const episodeModal = createLoader(() =>
  import('./EpisodeModal').then((module) => module.default),
);

/**
 * Starts loading the modal's chunk now (idle time, or a tile's pointerenter
 * or focus when that comes first). Tiles that open the modal
 * also carry `data-episode-tile="S03E05"` on the element the card grows from.
 */
export function preloadEpisodeModal() {
  episodeModal.preload();
}
