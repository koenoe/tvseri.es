import type { TasteShow } from '@tvseri.es/schemas';
import Image from 'next/image';
import TileLink from '@/components/ui/tile/TileLink';
import showPath from '@/lib/routing/showPath';

import NewToYouTag from '../../blocks/NewToYouTag';
import WatchlistAdd from '../../blocks/WatchlistAdd';

/**
 * The + on a poster: shown on hover or focus (always on touch
 * screens), and while the show is saved
 */
const PICK_ADD =
  'absolute bottom-2 left-1/2 -ml-4 translate-y-1 bg-[rgb(15_20_20/0.6)] opacity-0 transition-[opacity,translate] duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 data-[on=true]:translate-y-0 data-[on=true]:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100';

/** How many picks the card shows (three) */
const PICKS = 3;

function Pick({ show }: Readonly<{ show: TasteShow }>) {
  const href = showPath(show.id, show.slug);
  return (
    <li className="group flex min-w-0 flex-col gap-2">
      <div className="relative">
        {/* the poster's box holds its size: an image that fails to load
            draws its title, which must not make the card taller */}
        <TileLink className="block aspect-[2/3]" href={href} title={show.title}>
          {show.posterImage ? (
            <Image
              alt={show.title}
              className="block size-full overflow-hidden rounded-8 bg-white/6 object-cover shadow-[0_10px_20px_-8px_rgb(0_0_0/0.8)]"
              height={150}
              src={show.posterImage}
              width={100}
            />
          ) : (
            <span className="block size-full rounded-8 bg-white/6">
              <span className="sr-only">{show.title}</span>
            </span>
          )}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-8 bg-black/55 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100"
          />
        </TileLink>
        <WatchlistAdd
          className={PICK_ADD}
          seriesId={show.id}
          title={show.title}
        />
      </div>
    </li>
  );
}

/**
 * "New to you from juno" and up to three of their shows you have in none of
 * your lists: posters only (the title is the poster's name and hover title)
 */
export default function NewToYouPicks({
  picks,
  username,
}: Readonly<{ picks: ReadonlyArray<TasteShow>; username: string }>) {
  const shown = picks.slice(0, PICKS);
  if (shown.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2 whitespace-nowrap text-body-sm text-white/60">
        <NewToYouTag variant="inline" />
        <span className="truncate">
          from <b className="font-semibold text-white">{username}</b>
        </span>
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
        {shown.map((show) => (
          <Pick key={show.id} show={show} />
        ))}
      </ul>
    </div>
  );
}
