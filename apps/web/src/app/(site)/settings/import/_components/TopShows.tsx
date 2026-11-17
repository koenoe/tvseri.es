import Image from 'next/image';
import Dot from '@/components/ui/lane/Dot';
import { plural } from '@/lib/format/text';
import { formatGrouped } from '@/lib/formatCount';

import type { ImportedShow } from '@/lib/import/contract';
import { CARD_COUNT, CARD_HEAD, CARD_TITLE } from './styles';

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
        <span className={`${CARD_COUNT} max-md:basis-full`}>{line}</span>
      </div>
      <ul className="grid grid-cols-8 gap-4 max-md:grid-cols-4 max-md:gap-x-4 max-md:gap-y-5">
        {shows.map((show) => (
          <li className="flex min-w-0 flex-col gap-2" key={show.id}>
            {show.posterImage ? (
              <Image
                alt=""
                className="aspect-2/3 w-full rounded-10 object-cover shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
                height={150}
                sizes="(max-width: 767px) 25vw, 100px"
                src={show.posterImage}
                width={100}
              />
            ) : (
              <span className="aspect-2/3 w-full rounded-10 bg-white/6" />
            )}
            <b className="truncate text-caption font-normal" title={show.title}>
              {show.title}
            </b>
            <span className="text-caption text-white/60 tabular-nums">
              {plural(show.count, 'episode')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
