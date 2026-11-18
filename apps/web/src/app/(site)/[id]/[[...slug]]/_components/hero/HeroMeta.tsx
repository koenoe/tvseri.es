import { landingSlugForId } from '@tvseri.es/constants';
import type { TvSeries } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import {
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { seriesSeasons } from '@/lib/format/status';
import landingPath from '@/lib/routing/landingPath';

function Genres({ genres }: Readonly<{ genres: TvSeries['genres'] }>) {
  return genres.map((genre, index) => {
    const slug = landingSlugForId('genre', genre.id);
    return (
      <Fragment key={genre.id}>
        {index > 0 ? ', ' : null}
        {slug ? (
          <Link className="hover:underline" href={landingPath('genre', slug)}>
            {genre.name}
          </Link>
        ) : (
          genre.name
        )}
      </Fragment>
    );
  });
}

/** Phones: the full width, so the age rating and logo end at its right edge */
const ROW = 'gap-3 max-md:w-full md:gap-4';

/**
 * The facts under the title: year, seasons, genres (links to the genre
 * landing) and, from the viewer's region, the age rating and provider logo at
 * the end of the row. Phones: the genres truncate so the row stays one
 * line.
 */
export default function HeroMeta({
  children,
  series,
}: Readonly<{
  /** The age rating and provider hole. */
  children?: ReactNode;
  series: Pick<
    TvSeries,
    'genres' | 'numberOfSeasons' | 'releaseYear' | 'seasons' | 'status'
  >;
}>) {
  const genreNames = series.genres.map((genre) => genre.name).join(', ');
  const { airedSeasons } = seriesSeasons(series);
  return (
    <MetaRow className={ROW}>
      <MetaItem icon={calendarGlyph}>{series.releaseYear}</MetaItem>
      {airedSeasons > 0 ? (
        <MetaItem icon={seasonGlyph}>{plural(airedSeasons, 'season')}</MetaItem>
      ) : null}
      {series.genres.length > 0 ? (
        <MetaItem icon={tagGlyph} shrink title={genreNames}>
          <Genres genres={series.genres} />
        </MetaItem>
      ) : null}
      {children}
    </MetaRow>
  );
}
