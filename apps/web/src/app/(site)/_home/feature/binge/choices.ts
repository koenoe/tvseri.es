import type { Feature, TvSeries } from '@tvseri.es/schemas';

type Binge = Extract<Feature, Readonly<{ kind: 'binge' }>>;

/** What the calculator's island needs of one show (kept small: RSC props) */
export type BingeChoice = Readonly<{
  id: number;
  poster: string;
  /** minutes per episode */
  runtime: number;
  /** episodes per season, in order */
  seasons: ReadonlyArray<number>;
  slug: string;
  title: string;
}>;

const choiceOf = (
  series: TvSeries,
  runtime: number,
  seasons: ReadonlyArray<number>,
): BingeChoice => ({
  id: series.id,
  poster: series.posterImage,
  runtime,
  seasons,
  slug: series.slug,
  title: series.title,
});

/** The day's show alone, from its own seasons (an API answer without `shows`) */
const seasonsOf = (feature: Binge): ReadonlyArray<number> => {
  const seasons = (feature.series.seasons ?? [])
    .map((season) => season.numberOfAiredEpisodes ?? season.numberOfEpisodes)
    .filter((count): count is number => Boolean(count));
  return seasons.length > 0 ? seasons : [feature.numberOfEpisodes];
};

/** The shows to compare, the day's pick first; only those with episodes */
export function bingeChoices(feature: Binge): ReadonlyArray<BingeChoice> {
  const shows = feature.shows ?? [];
  const choices =
    shows.length > 0
      ? shows.map((show) =>
          choiceOf(show.series, show.episodeRuntime, show.seasons),
        )
      : [choiceOf(feature.series, feature.episodeRuntime, seasonsOf(feature))];
  return choices.filter((choice) => choice.seasons.some((count) => count > 0));
}
