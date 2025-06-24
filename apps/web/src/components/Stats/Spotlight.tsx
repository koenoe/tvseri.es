import {
  type Episode,
  type TvSeries,
  type WatchedItem,
} from '@tvseri.es/types';
import { cx } from 'class-variance-authority';
import Image from 'next/image';
import Link from 'next/link';

import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';

import SpotlightBackground from '../Spotlight/SpotlightBackground';
import SpotlightTitle from '../Spotlight/SpotlightTitle';

export default function Spotlight({
  tvSeries,
  episode,
  item,
  className,
}: Readonly<{
  tvSeries: TvSeries;
  episode: Episode;
  item: WatchedItem;
  className?: string;
}>) {
  return (
    <Link
      href={{
        pathname: `/tv/${tvSeries.id}/${tvSeries.slug}`,
        query: { season: episode.seasonNumber },
      }}
      className={cx(
        "relative flex aspect-[16/14] flex-shrink-0 items-end overflow-clip rounded shadow-lg after:absolute after:inset-0 after:rounded after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/10] lg:aspect-[16/8] xl:aspect-[16/12] 2xl:aspect-[16/10]",
        className,
      )}
    >
      <SpotlightBackground item={tvSeries} />
      <div className="w-full p-9 xl:p-12">
        <SpotlightTitle item={tvSeries} size="small" />
        <div className="mt-6 flex gap-4 whitespace-nowrap text-white/60 md:gap-12">
          <div className="relative flex w-full justify-center gap-2 text-xs md:justify-start md:text-[0.8rem]">
            <div className="after:ml-2 after:content-['·']">
              {formatDate(item.watchedAt)}
            </div>
            <div className="after:ml-2 after:content-['·']">
              {formatSeasonAndEpisode({
                seasonNumber: item.seasonNumber,
                episodeNumber: item.episodeNumber,
              })}
            </div>
            <div className="after:ml-2 after:content-['·']">
              {episode.title}
            </div>
            <div>{formatRuntime(episode.runtime)}</div>
          </div>
        </div>
      </div>
      {item.watchProviderLogoImage && (
        <Image
          className="absolute right-4 top-4 z-10 h-8 w-8 rounded-md"
          src={item.watchProviderLogoImage}
          alt=""
          unoptimized
          width={92}
          height={92}
        />
      )}
    </Link>
  );
}
