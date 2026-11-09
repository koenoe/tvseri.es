import { twMerge } from 'tailwind-merge';

import { CalendarOutlineIcon } from '@/components/Icons/CalendarOutlineIcon';
import { formatDateOnly } from '@/utils/formatDate';

import Runtime from './Runtime';

/**
 * Runtime and air date of an episode, as shown on the episode tiles and the
 * per-show watch history. Runtime first; the air date always gets the
 * calendar icon.
 */
export default function EpisodeMeta({
  airDate,
  className,
  runtime,
}: Readonly<{
  airDate?: string | null;
  className?: string;
  runtime?: number | null;
}>) {
  const classes = twMerge(
    'flex w-full items-center gap-4 text-xs opacity-60 md:text-[0.8rem]',
    className,
  );

  return (
    <div className={classes}>
      {runtime ? <Runtime minutes={runtime} /> : null}
      {airDate ? (
        <span className="flex items-center gap-1.5 text-nowrap">
          <CalendarOutlineIcon className="size-3.5 flex-shrink-0" />
          {formatDateOnly(airDate)}
        </span>
      ) : null}
    </div>
  );
}
