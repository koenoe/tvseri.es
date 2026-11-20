import { formatGrouped, plural } from '@tvseri.es/utils';
import * as m from 'motion/react-m';
import Image from 'next/image';
import { SWAP_FROM, SWAP_IN } from '@/components/motion/swap';
import Dot from '@/components/ui/lane/Dot';

import type { ImportedShow } from '@/lib/import/contract';
import { CARD_COUNT, CARD_HEAD, CARD_TITLE } from './styles';

const COUNT_LINE = `${CARD_COUNT} max-md:basis-full`;

/**
 * The posters land in the order they brought most in, 50ms apart, each
 * rising 6px (the swap's rise), once the block has risen in with the card
 * (`ResultCard`'s steps), as the Ripple's last ring settles: the outcome,
 * the rings and the shows read as one exhale. Labels are the card's.
 */
const POSTERS = {
  visible: { transition: { delayChildren: 0.3, staggerChildren: 0.05 } },
} as const;
const POSTER = { hidden: SWAP_FROM, visible: SWAP_IN } as const;

/** A poster's frame: its ground shows until the picture has loaded */
const POSTER_FRAME = 'aspect-2/3 w-full rounded-10 bg-white/6';
const POSTER_IMAGE = `${POSTER_FRAME} object-cover image-outline`;

/** "The shows it brought in": 8 posters, most imported episodes first. */
export default function TopShows({
  count,
  shows,
  title,
}: Readonly<{
  count: number;
  shows: ReadonlyArray<ImportedShow>;
  title: string;
}>) {
  if (shows.length === 0) {
    return null;
  }
  const line = `${shows.length} of ${formatGrouped(count)}, most episodes first`;
  return (
    <div className="relative flex flex-col gap-4 border-white/7 border-t pt-6">
      <div className={CARD_HEAD}>
        <Dot tone="cyan" />
        <h3 className={CARD_TITLE}>{title}</h3>
        <span className={COUNT_LINE}>{line}</span>
      </div>
      <m.ul
        className="grid grid-cols-8 gap-4 max-md:grid-cols-4 max-md:gap-x-4 max-md:gap-y-5"
        variants={POSTERS}
      >
        {shows.map((show) => (
          <m.li
            className="flex min-w-0 flex-col gap-2"
            key={show.id}
            variants={POSTER}
          >
            {show.posterImage ? (
              <Image
                alt=""
                className={POSTER_IMAGE}
                height={150}
                sizes="(max-width: 767px) 25vw, 100px"
                src={show.posterImage}
                width={100}
              />
            ) : (
              <span className={POSTER_FRAME} />
            )}
            <b className="truncate text-caption font-normal" title={show.title}>
              {show.title}
            </b>
            <span className="text-caption text-white/60 tabular-nums">
              {plural(show.count, 'episode')}
            </span>
          </m.li>
        ))}
      </m.ul>
    </div>
  );
}
