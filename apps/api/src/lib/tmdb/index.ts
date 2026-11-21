/**
 * The names the mark-recording files (lambdas/scrobble.ts,
 * routes/user/index.ts) still import from here while they are reworked;
 * everything else imports the module it needs. Remove with their last use.
 */
export { getShow as fetchTvSeriesBase } from '@/lib/catalogue';
export { findByExternalId, searchTvSeries } from './discover';
export { fetchTvSeriesEpisode } from './seasons';
export { fetchTvSeriesWatchProvider } from './watchProviders';
