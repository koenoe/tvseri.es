'use client';

import type { CSSProperties } from 'react';

import PosterArt from '@/components/ui/tile/PosterArt';
import TileLink from '@/components/ui/tile/TileLink';
import { TILE_HOVER } from '@/components/ui/tile/tileHover';
import { useNewToViewer } from '@/lib/marking/hooks';
import showPath from '@/lib/routing/showPath';
import type { NotFoundShow } from './notFoundShow';

const SMALL_POSTER: CSSProperties = { '--tile-radius': '8px' } as CSSProperties;

/** “Or start something new” shows five posters. */
const POSTERS = 5;

const POSTER_LINK = `block rounded-8 [&>span]:shadow-[0_10px_15px_-3px_rgb(0_0_0/0.25)] ${TILE_HOVER}`;

/**
 * “Or start something new”: five trending posters, 64 ×
 * 96 (58 × 87 on phones), each a link to its show, with a single
 * shadow (darker than the row tiles' `shadow-lg`). The one tile hover
 * (`tileHover`): a 4% grow. Never a series the viewer already has
 * (`useNewToViewer`): the first five of the pool that are new to them.
 */
export default function NotFoundPosters({
  pool,
}: Readonly<{ pool: ReadonlyArray<NotFoundShow> }>) {
  const fresh = useNewToViewer(pool);
  const shows = fresh.slice(0, POSTERS);
  if (shows.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="not-found-start" className="flex flex-col gap-3">
      <h2
        className="text-overline text-white/60 uppercase"
        id="not-found-start"
      >
        Or start something new
      </h2>
      <ul className="flex gap-2">
        {shows.map((show) => {
          const href = showPath(show.id, show.slug);
          return (
            <li className="w-14.5 min-w-0 md:w-16" key={show.id}>
              <TileLink
                className={POSTER_LINK}
                href={href}
                style={SMALL_POSTER}
              >
                <PosterArt
                  poster={show.poster}
                  sizes="64px"
                  title={show.title}
                />
              </TileLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
