import { twMerge } from 'tailwind-merge';

import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';

/** The S01E01 badge used wherever a single episode is listed */
export default function SeasonEpisodeBadge({
  className,
  episodeNumber,
  seasonNumber,
}: Readonly<{
  className?: string;
  episodeNumber: number;
  seasonNumber: number;
}>) {
  const classes = twMerge(
    'flex h-6 w-14 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-center text-xs font-medium',
    className,
  );

  return (
    <span className={classes}>
      {formatSeasonAndEpisode({ episodeNumber, seasonNumber })}
    </span>
  );
}
