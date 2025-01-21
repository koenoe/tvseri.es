import { notFound, unauthorized } from 'next/navigation';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import ExpandableText from '@/components/ExpandableText/ExpandableText';
import InfoLine from '@/components/InfoLine/InfoLine';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/Table';
import Poster from '@/components/Tiles/Poster';
import { fetchTvSeriesSeason } from '@/lib/tmdb';
import { type Episode, type Season } from '@/types/tv-series';
import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';

type Props = Readonly<{
  params: Promise<{ id: string }>;
}>;

async function fetchAllEpisodes(
  tvSeriesId: number,
  numberOfSeasons: number,
): Promise<Episode[]> {
  // Create an array of promises for fetching each season
  const seasonPromises: Promise<Season | undefined>[] = Array.from(
    { length: numberOfSeasons },
    (_, index) => fetchTvSeriesSeason(tvSeriesId, index + 1),
  );

  try {
    const seasons = await Promise.all(seasonPromises);
    const allEpisodes = seasons
      .filter((season): season is Season => season != null)
      .reduce<Episode[]>((episodes, season) => {
        const seasonEpisodes = season.episodes || [];
        return episodes.concat(seasonEpisodes);
      }, []);

    const currentDate = new Date().getTime();
    const sortedEpisodes = allEpisodes
      .filter((episode) => new Date(episode.airDate).getTime() <= currentDate)
      .sort((a, b) => {
        if (!a.airDate) return 1;
        if (!b.airDate) return -1;
        return new Date(b.airDate).getTime() - new Date(a.airDate).getTime();
      });

    return sortedEpisodes;
  } catch (error) {
    throw error;
  }
}

export default async function TrackPage({ params: paramsFromProps }: Props) {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

  const params = await paramsFromProps;
  const tvSeries = await cachedTvSeries(params.id);

  if (!tvSeries || tvSeries.isAdult) {
    return notFound();
  }

  // Note: just here for now
  const episodes = await fetchAllEpisodes(
    tvSeries.id,
    tvSeries.numberOfEpisodes,
  );

  return (
    <>
      <div className="flex gap-10">
        <Poster
          item={tvSeries}
          size="small"
          className="hidden flex-shrink-0 md:block"
        />
        <div>
          <h1 className="mb-2 text-lg font-medium lg:text-xl">
            {tvSeries.title}
          </h1>
          <InfoLine tvSeries={tvSeries} />
          <ExpandableText className="mt-4 max-w-4xl text-sm">
            {tvSeries.description}
          </ExpandableText>
          <div className="mt-4 flex gap-2">
            <button className="flex h-11 min-w-24 cursor-pointer items-center justify-center gap-2 rounded-3xl bg-white/5 px-5 text-xs leading-none tracking-wide hover:bg-white/10">
              <svg
                className="size-4"
                fill="currentColor"
                viewBox="0 0 512 512"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="256" cy="256" r="64" />
                <path d="M394.82,141.18C351.1,111.2,304.31,96,255.76,96c-43.69,0-86.28,13-126.59,38.48C88.52,160.23,48.67,207,16,256c26.42,44,62.56,89.24,100.2,115.18C159.38,400.92,206.33,416,255.76,416c49,0,95.85-15.07,139.3-44.79C433.31,345,469.71,299.82,496,256,469.62,212.57,433.1,167.44,394.82,141.18ZM256,352a96,96,0,1,1,96-96A96.11,96.11,0,0,1,256,352Z" />
              </svg>
              <div className="flex items-center gap-2">
                <span>Watched on</span>
                <span className="rounded-lg border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-center text-xs text-neutral-400">
                  {formatDate(Date.now())}
                </span>
              </div>
            </button>
            <button className="flex h-11 min-w-24 cursor-pointer items-center justify-center gap-2 rounded-3xl bg-white/5 px-5 text-xs leading-none tracking-wide hover:bg-white/10">
              <svg
                className="size-4"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
              >
                <path d="M26.996 12.898c-.064-2.207-1.084-4.021-2.527-5.13-1.856-1.428-4.415-1.69-6.542-.132-.702.516-1.359 1.23-1.927 2.168-.568-.938-1.224-1.652-1.927-2.167-2.127-1.559-4.685-1.297-6.542.132-1.444 1.109-2.463 2.923-2.527 5.13-.035 1.172.145 2.48.788 3.803 1.01 2.077 5.755 6.695 10.171 10.683l.035.038.002-.002.002.002.036-.038c4.415-3.987 9.159-8.605 10.17-10.683.644-1.323.822-2.632.788-3.804z" />
              </svg>
              <span>Add to favorites</span>
            </button>
          </div>
        </div>
      </div>
      <Table className="mt-10 max-h-[calc(100vh-33rem)] text-xs">
        <TableHeader className="sticky top-0 z-10 border-b">
          <TableRow>
            <TableHead className="w-10">
              <input type="checkbox" defaultChecked />
            </TableHead>
            <TableHead>Episode</TableHead>
            <TableHead className="w-48">Air date</TableHead>
            <TableHead className="w-24">Runtime</TableHead>
            <TableHead className="w-48">Watched on</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {episodes.map((episode) => (
            <TableRow key={episode.id}>
              <TableCell>
                <input type="checkbox" defaultChecked />
              </TableCell>
              <TableCell>
                <div className="flex min-h-3 gap-3 leading-relaxed">
                  <span className="flex h-6 w-14 flex-shrink-0 items-center justify-center rounded bg-neutral-700 text-center text-xs font-medium">
                    {formatSeasonAndEpisode({
                      seasonNumber: episode.seasonNumber,
                      episodeNumber: episode.episodeNumber,
                    })}
                  </span>
                  {episode.title}
                </div>
              </TableCell>
              <TableCell>{formatDate(episode.airDate)}</TableCell>
              <TableCell>{formatRuntime(episode.runtime)}</TableCell>
              <TableCell>
                <span className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-center text-xs text-neutral-400">
                  {formatDate(Date.now())}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-10 flex w-full items-center gap-x-4">
        <div className="flex items-baseline text-sm text-white/60">
          <span className="rounded bg-white/10 px-2 py-1 font-medium text-white">
            {episodes.length.toLocaleString()}
          </span>
          <span className="ml-2">items</span>
        </div>
        <button className="ml-auto flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white/5 px-5 text-sm leading-none tracking-wide hover:bg-white/10">
          <span>Back</span>
        </button>
        <button className="flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white px-5 text-sm leading-none tracking-wide text-neutral-900">
          <span>Save</span>
        </button>
      </div>
    </>
  );
}
