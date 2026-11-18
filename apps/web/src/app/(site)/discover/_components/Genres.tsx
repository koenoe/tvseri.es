import Link from 'next/link';

import { seasonGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { isUnavailable } from '@/lib/cache/unavailable';
import { pluralCapped } from '@/lib/format/text';
import landingPath from '@/lib/routing/landingPath';
import { GENRE_TILES } from '../_data/hubTiles';
import { getGenreCounts } from '../_data/rows';
import { GENRE_CELL, GENRE_GRID, GENRE_NAME, GENRE_TILE } from './HubSkeletons';

const GENRE_LINK = `${GENRE_TILE} transition-colors duration-200 hover:bg-white/9`;

/**
 * Doors to the genre landings: a plain tile per `GENRE_TILES` entry,
 * name and show count, in full rows at every width (`GENRE_GRID`). Without the
 * counts the tiles still open their landings (the count's place stays).
 * Phones show them too, in the lens tiles' phone look, so every genre is reachable from a phone's Discover.
 */
export default async function Genres() {
  const found = await getGenreCounts();
  const counts: Readonly<Record<string, number>> = isUnavailable(found)
    ? {}
    : found;
  return (
    <ul className={GENRE_GRID} data-slot="genres">
      {GENRE_TILES.map((genre) => {
        const count = counts[genre.slug];
        const href = landingPath('genre', genre.slug);
        return (
          <li className={GENRE_CELL} key={genre.slug}>
            <Link className={GENRE_LINK} href={href}>
              <b className={GENRE_NAME}>{genre.name}</b>
              <MetaRow className="gap-3 text-caption">
                <MetaItem icon={seasonGlyph} iconSize={12}>
                  {count === undefined
                    ? ''
                    : pluralCapped(count, 'series', 'series')}
                </MetaItem>
              </MetaRow>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
