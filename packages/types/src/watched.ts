export type WatchedItem = Readonly<{
  episodeNumber: number;
  posterImage?: string; // deprecated
  posterPath: string;
  runtime: number;
  seasonNumber: number;
  seriesId: number;
  slug: string;
  title: string;
  userId: string;
  watchProviderLogoPath?: string | null;
  watchProviderLogoImage?: string | null;
  watchProviderName?: string | null;
  watchedAt: number;
}>;
