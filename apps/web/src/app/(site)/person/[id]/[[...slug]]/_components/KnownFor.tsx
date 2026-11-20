import Image from 'next/image';
import { TextLine } from '@/components/ui/ghost/ghosts';
import { variantGridFilmGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { SectionError } from '@/components/ui/row/RowError';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import SectionHead from '@/components/ui/section/SectionHead';
import TileLink from '@/components/ui/tile/TileLink';
import { TILE_HOVER } from '@/components/ui/tile/tileHover';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';
import type { KnownForTile } from '@/lib/person/knownFor';
import { loadKnownFor } from '@/lib/person/loaders';
import { PERSON_SECTION, PERSON_SNAP_ROW } from './layout';

/** Desktop: five across; phones: a snap row of 128px posters */
const ROW = cn(PERSON_SNAP_ROW, 'lg:grid-cols-5 lg:gap-5');
const TILE =
  'group flex w-32 shrink-0 snap-start flex-col gap-2 lg:w-auto lg:min-w-0 lg:gap-2.5';
const POSTER =
  'image-rim relative block h-48 overflow-hidden rounded-10 bg-white/5 lg:aspect-2/3 lg:h-auto lg:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.7)]';
/** The placeholder: the row pulses once, the posters are flat (no shadow) */
const GHOST_ROW = cn(ROW, 'animate-ghost');
const POSTER_GHOST = cn(POSTER, GHOST_FILL, 'lg:shadow-none');
const LINE = 'flex items-center gap-1.5 truncate text-meta text-white/60';

function TileBody({ tile }: Readonly<{ tile: KnownForTile }>) {
  const film = !tile.href;
  const image = cn('object-cover', film && 'saturate-[.75] brightness-[.85]');
  // a show is a link: the one tile hover (`tileHover`); a film is not
  const poster = cn(POSTER, !film && TILE_HOVER);
  return (
    <>
      <span className={poster}>
        {tile.poster ? (
          <Image
            alt={film ? tile.title : ''}
            className={image}
            fill
            sizes="(min-width: 1024px) 160px, 128px"
            src={tile.poster}
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 lg:gap-0.75">
        <b className="truncate text-body-sm font-semibold">{tile.title}</b>
        <span className={LINE}>
          {film ? (
            <Icon
              className="hidden shrink-0 lg:block"
              glyph={variantGridFilmGlyph}
              size={12}
            />
          ) : null}
          <span className="truncate">{tile.line1}</span>
        </span>
        <span className={LINE}>{tile.line2}</span>
      </span>
    </>
  );
}

/**
 * Known for: shows link to the
 * show page, films are shown but not clickable.
 */
export default async function KnownFor({ id }: Readonly<{ id: number }>) {
  const tiles = await loadKnownFor(id);
  if (isUnavailable(tiles)) {
    return (
      <SectionError
        inset="flush"
        placeholder={<KnownForSkeleton />}
        state="unavailable"
        title="Known for"
      />
    );
  }
  if (tiles.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="person-known-for"
      className={PERSON_SECTION}
      data-slot="person-known-for"
    >
      <SectionHead id="person-known-for" title="Known for" />
      <div className={ROW}>
        {tiles.map((tile) => {
          const showId = `show-${tile.id}`;
          const filmId = `film-${tile.id}`;
          return tile.href ? (
            <TileLink
              aria-label={tile.aria}
              className={TILE}
              href={tile.href}
              key={showId}
            >
              <TileBody tile={tile} />
            </TileLink>
          ) : (
            <div className={TILE} key={filmId}>
              <TileBody tile={tile} />
            </div>
          );
        })}
        <span aria-hidden="true" className="w-0 shrink-0 lg:hidden" />
      </div>
    </section>
  );
}

/** The same space while Known for loads */
export function KnownForSkeleton() {
  return (
    <section
      aria-hidden="true"
      className={PERSON_SECTION}
      data-placeholder="person-known-for"
    >
      <SectionHead id="person-known-for-loading" title="Known for" />
      <div className={GHOST_ROW}>
        {[0, 1, 2, 3, 4].map((key) => (
          <div className={TILE} key={key}>
            <span className={POSTER_GHOST} />
            <span className="flex h-[68px] flex-col gap-0.5 lg:h-[67px] lg:gap-0.75">
              <TextLine className="text-body-sm" width="w-3/4" />
              <TextLine className="text-meta" width="w-1/2" />
              <TextLine className="text-meta" width="w-2/5" />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
