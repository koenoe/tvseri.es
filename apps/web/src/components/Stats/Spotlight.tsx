import type { StatsSpotlightItem } from '@tvseri.es/schemas';

import Image from 'next/image';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';
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
      />
      <div className="w-full p-9 xl:p-12">
        <SpotlightTitle
          item={{
            title: tvSeries.title,
            titleTreatmentImage: tvSeries.titleTreatmentImage,
          }}
          size="small"
        />
        <div className="mt-6 flex gap-4 whitespace-nowrap text-white/60 md:gap-12">
          <div className="relative flex w-full justify-center gap-2 text-xs md:justify-start md:text-[0.8rem]">
            <div className="after:ml-2 after:content-['·']">
              {formatDate(watchedAt)}
            </div>
            <div className="after:ml-2 after:content-['·']">
              {formatSeasonAndEpisode({
                episodeNumber: episode.episodeNumber,
                seasonNumber: episode.seasonNumber,
              })}
            </div>
            <div className="after:ml-2 after:content-['·']">
              {episode.title}
            </div>
            <div>{formatRuntime(episode.runtime)}</div>
          </div>
        </div>
      </div>
      {watchProviderLogo && (
        <Image
          alt=""
          className="absolute right-4 top-4 z-10 h-8 w-8 rounded-md"
          height={92}
          src={watchProviderLogo}
          unoptimized
          width={92}
        />
      )}
    </Link>
  );
}
