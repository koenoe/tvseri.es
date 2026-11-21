import type { paths } from '../tmdb-v3';

/** A TMDB v3 path, as a pattern (`/3/tv/${number}`) or a literal */
export type TmdbPath = keyof paths;

/** A path's 200 JSON, as TMDB's OpenAPI spec types it */
type SpecResponse<P extends TmdbPath> =
  paths[P] extends Readonly<{
    get: Readonly<{
      responses: Readonly<{
        200: Readonly<{ content: Readonly<{ 'application/json': infer J }> }>;
      }>;
    }>;
  }>
    ? J
    : never;

export type TmdbTvSeriesImages = SpecResponse<`/3/tv/${number}/images`>;

type TmdbTvSeriesDetails = SpecResponse<`/3/tv/${number}`>;

/** An episode as a show's details carry it (`last_episode_to_air`) */
type TmdbEpisodeSummary = NonNullable<
  TmdbTvSeriesDetails['last_episode_to_air']
>;

/**
 * A show's details (`/3/tv/:id`). The spec types `next_episode_to_air` as
 * unknown: it has the last episode's shape, and both are null when there is
 * none.
 */
export type TmdbTvSeries = Omit<
  TmdbTvSeriesDetails,
  'last_episode_to_air' | 'next_episode_to_air'
> & {
  last_episode_to_air?: TmdbEpisodeSummary | null;
  next_episode_to_air?: TmdbEpisodeSummary | null;
  /** Present when requested with `append_to_response=external_ids` */
  external_ids?: { imdb_id?: string | null };
  /** Present when the images were read too (a second call) */
  images?: TmdbTvSeriesImages;
};

export type TmdbSearchTvSeries = SpecResponse<'/3/search/tv'>;

/**
 * A show as TMDB's lists give it (search, discover, recommendations, a
 * person's credits, find): no details, its genres as ids
 */
export type TmdbTvSeriesListItem = NonNullable<
  TmdbSearchTvSeries['results']
>[number];

export type TmdbMovie = SpecResponse<`/3/movie/${number}`> & {
  images?: TmdbTvSeriesImages;
};

type TmdbSearchPersonSpec = SpecResponse<'/3/search/person'>;
type TmdbSearchPersonResult = NonNullable<
  TmdbSearchPersonSpec['results']
>[number];
/** A film as TMDB's lists give it (a person's `known_for`) */
export type TmdbMovieListItem = NonNullable<
  TmdbSearchPersonResult['known_for']
>[number];

/**
 * `/3/search/person`. The spec types `known_for` as films only: it holds
 * shows as well, told apart by `media_type`.
 */
export type TmdbSearchPerson = Omit<TmdbSearchPersonSpec, 'results'> & {
  results?: ReadonlyArray<
    Omit<TmdbSearchPersonResult, 'known_for'> & {
      known_for?: ReadonlyArray<
        | (TmdbTvSeriesListItem & { media_type: 'tv' })
        | (Omit<TmdbMovieListItem, 'media_type'> & { media_type?: 'movie' })
      >;
    }
  >;
};

/** A service offering a show, or listed for a region: TMDB always names it */
type TmdbProviderOffer = Readonly<{
  display_priority: number;
  logo_path: string;
  provider_id: number;
  provider_name: string;
}>;

/**
 * `/3/tv/:id/watch/providers`. The spec lists each region by name with the
 * offer kinds it happened to have; every region has the same shape.
 */
export type TmdbTvSeriesWatchProviders = Readonly<{
  id: number;
  results?: Readonly<
    Record<
      string,
      | Readonly<{
          ads?: ReadonlyArray<TmdbProviderOffer>;
          buy?: ReadonlyArray<TmdbProviderOffer>;
          flatrate?: ReadonlyArray<TmdbProviderOffer>;
          free?: ReadonlyArray<TmdbProviderOffer>;
          link?: string;
          rent?: ReadonlyArray<TmdbProviderOffer>;
        }>
      | undefined
    >
  >;
}>;

export type TmdbTvSeriesCredits =
  SpecResponse<`/3/tv/${number}/aggregate_credits`>;

export type TmdbTvSeriesSeason =
  SpecResponse<`/3/tv/${number}/season/${number}`>;

type TmdbDiscoverTvSeriesSpec = SpecResponse<'/3/discover/tv'>;

/** `/3/discover/tv`. The spec leaves `adult` out of the items; TMDB sends it. */
export type TmdbDiscoverTvSeries = Omit<TmdbDiscoverTvSeriesSpec, 'results'> & {
  results?: ReadonlyArray<TmdbTvSeriesListItem>;
};

export type TmdbDiscoverMovieQuery =
  paths['/3/discover/movie']['get']['parameters']['query'];

export type TmdbDiscoverTvSeriesQuery =
  paths['/3/discover/tv']['get']['parameters']['query'];

/**
 * `/3/watch/providers/tv`. The spec lists `display_priorities` by region name;
 * it has a priority for any region.
 */
export type TmdbWatchProviders = Readonly<{
  results?: ReadonlyArray<
    TmdbProviderOffer &
      Readonly<{ display_priorities?: Readonly<Record<string, number>> }>
  >;
}>;

export type TmdbPerson = SpecResponse<`/3/person/${number}`>;

export type TmdbPersonTvCredits =
  SpecResponse<`/3/person/${number}/tv_credits`>;

export type TmdbExternalSource =
  paths[`/3/find/${string}`]['get']['parameters']['query']['external_source'];

type TmdbFindByIdSpec = SpecResponse<`/3/find/${string}`>;

/**
 * `/3/find/:id`. The spec types the TV results as unknown: shows as lists
 * give them, episodes as a show's details do (with their `show_id`), and
 * seasons as a show's details list them.
 */
export type TmdbFindByIdResults = Omit<
  TmdbFindByIdSpec,
  'tv_results' | 'tv_episode_results' | 'tv_season_results'
> & {
  tv_results?: ReadonlyArray<TmdbTvSeriesListItem>;
  tv_episode_results?: ReadonlyArray<TmdbEpisodeSummary>;
  tv_season_results?: ReadonlyArray<
    NonNullable<TmdbTvSeriesDetails['seasons']>[number]
  >;
};

export type TmdbNetwork = SpecResponse<`/3/network/${number}`>;

type TmdbEpisodeImagesSpec =
  SpecResponse<`/3/tv/${number}/season/${number}/episode/${number}/images`>;

/**
 * An episode's images. The spec leaves a still's `file_path` optional; an
 * image is its file.
 */
type TmdbEpisodeImages = Omit<TmdbEpisodeImagesSpec, 'stills'> & {
  stills?: ReadonlyArray<
    NonNullable<TmdbEpisodeImagesSpec['stills']>[number] & {
      file_path: string;
    }
  >;
};

/** Whether two types are the same (pattern paths compared both ways) */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * A path's 200 JSON: the spec's, except where the spec is wrong (the types
 * above say how)
 */
export type TmdbResponse<P extends TmdbPath> =
  Same<P, `/3/tv/${number}`> extends true
    ? TmdbTvSeries
    : Same<P, `/3/find/${string}`> extends true
      ? TmdbFindByIdResults
      : Same<P, '/3/search/person'> extends true
        ? TmdbSearchPerson
        : Same<P, '/3/discover/tv'> extends true
          ? TmdbDiscoverTvSeries
          : Same<P, `/3/tv/${number}/watch/providers`> extends true
            ? TmdbTvSeriesWatchProviders
            : Same<P, '/3/watch/providers/tv'> extends true
              ? TmdbWatchProviders
              : Same<
                    P,
                    `/3/tv/${number}/season/${number}/episode/${number}/images`
                  > extends true
                ? TmdbEpisodeImages
                : SpecResponse<P>;

/**
 * What `append_to_response` can add to a path's answer: its sub-resources
 * (`credits`, `season/${number}`…), each under its own name
 */
export type TmdbAppendable<P extends TmdbPath> = TmdbPath extends infer K
  ? K extends `${P}/${infer Name}`
    ? Name
    : never
  : never;

/** The sub-resources appended to a path's answer, absent when TMDB has none */
export type TmdbAppended<P extends TmdbPath, A extends string> = {
  [Name in A]?: `${P}/${Name}` extends TmdbPath
    ? TmdbResponse<`${P}/${Name}`>
    : never;
};
