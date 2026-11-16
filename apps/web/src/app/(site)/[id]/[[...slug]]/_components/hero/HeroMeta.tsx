import { landingSlugForId } from '@tvseri.es/constants';
import type { TvSeries } from '@tvseri.es/schemas';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import {
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { plural } from '@/lib/format/text';
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

/**
 * The facts under the title: year, seasons, genres (links to the genre
 * landing) and, from the viewer's region, the age rating and provider logo at
 * the end of the row (ep0-cr, ep0-wp).
 */
export default function HeroMeta({
  children,
  series,
}: Readonly<{
  /** The age rating and provider hole. */
  children?: ReactNode;
  series: Pick<TvSeries, 'genres' | 'numberOfSeasons' | 'releaseYear'>;
}>) {
  const genreNames = series.genres.map((genre) => genre.name).join(', ');
  return (
    <MetaRow className="gap-3 md:gap-4">
      <MetaItem icon={calendarGlyph}>{series.releaseYear}</MetaItem>
      {series.numberOfSeasons > 0 ? (
        <MetaItem icon={seasonGlyph}>
          {plural(series.numberOfSeasons, 'season')}
        </MetaItem>
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
