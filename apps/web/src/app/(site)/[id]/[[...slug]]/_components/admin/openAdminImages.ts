import { requestTray, useAdminState } from './adminStore';

export { wantImages } from './adminStore';

/**
 * Opens the admin image tray for a show: the Remote's Admin row
 * ("Hero images", I) calls it. The tray itself is only loaded for admins.
 *
 * @example
 * { id: 'hero-images', letter: 'I', label: 'Hero images', icon: pencilGlyph, onSelect: () => openAdminImages(seriesId), ...useAdminImagesKey(seriesId) }
 */
export function openAdminImages(seriesId: number): void {
  requestTray(seriesId);
}

/**
 * The Remote key's state: disabled with why ("1 backdrop, no logos: nothing
 * to choose") once the show's images are known; enabled before that.
 */
export function useAdminImagesKey(
  seriesId: number,
): Readonly<{ disabled: boolean; meta?: string }> {
  const load = useAdminState((state) => state.images[seriesId]);
  if (load?.status === 'ready' && !load.availability.canChoose) {
    return { disabled: true, meta: load.availability.why };
  }
  return { disabled: false };
}

/** The show's page on TMDB, for "Images on TMDB" (T) and "Add a logo on TMDB". */
export const tmdbImagesUrl = (
  seriesId: number,
  kind: 'backdrops' | 'logos' = 'backdrops',
) => `https://www.themoviedb.org/tv/${seriesId}/images/${kind}`;
