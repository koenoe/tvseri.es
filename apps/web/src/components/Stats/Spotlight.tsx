import type { StatsSpotlightItem } from '@tvseri.es/schemas';

import Image from 'next/image';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import SeasonEpisodeBadge from '@/components/EpisodeMeta/SeasonEpisodeBadge';
import WatchedMeta from '@/components/EpisodeMeta/WatchedMeta';
import formatDate from '@/utils/formatDate';
import SpotlightBackground from '../Spotlight/SpotlightBackground';
import SpotlightTitle from '../Spotlight/SpotlightTitle';

export default function Spotlight({
  item,
  className,
}: Readonly<{
  item: NonNullable<StatsSpotlightItem>;
  className?: string;
}>) {
  const { tvSeries, episode, watchedAt, watchProviderLogo } = item;

  return (
    <Link
      className={twMerge(
        "relative flex aspect-[16/14] flex-shrink-0 items-end overflow-clip rounded-xl shadow-lg after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/10] lg:aspect-[16/8] xl:aspect-[16/12] 2xl:aspect-[16/10]",
        className,
      )}
      href={{
        pathname: `/tv/${tvSeries.id}/${tvSeries.slug}`,
        query: { season: episode.seasonNumber },
      }}
    >
      <SpotlightBackground
        item={{
          backdropColor: tvSeries.backdropColor,
          backdropImage: tvSeries.backdropImage,
        }}
        sizes="(min-width: 1280px) 50vw, 100vw"
      />
      <div className="w-full p-9 xl:p-12">
        <SpotlightTitle
          item={{
            title: tvSeries.title,
            titleTreatmentImage: tvSeries.titleTreatmentImage,
          }}
          size="small"
        />
        <div className="relative mt-6 flex flex-col items-center gap-3 whitespace-nowrap md:items-start">
          <div className="flex min-w-0 max-w-full items-center gap-2">
            <SeasonEpisodeBadge
              episodeNumber={episode.episodeNumber}
              seasonNumber={episode.seasonNumber}
            />
            <span className="truncate text-sm">{episode.title}</span>
          </div>
          <WatchedMeta
            className="text-xs font-medium"
            runtime={episode.runtime}
          >
            <span>{formatDate(watchedAt)}</span>
          </WatchedMeta>
        </div>
      </div>
      {watchProviderLogo ? (
        <Image
          alt=""
          className="absolute right-4 top-4 z-10 h-8 w-8 rounded-md"
          height={32}
          src={watchProviderLogo}
          width={32}
        />
      ) : null}
    </Link>
  );
}
