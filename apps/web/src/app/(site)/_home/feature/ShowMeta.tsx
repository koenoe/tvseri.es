import type { TvSeries } from '@tvseri.es/schemas';

import {
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';

import { firstGenre } from '../genres';
import { showSeasons, showYears } from '../showFacts';

/**
 * The show's facts as the moments draw them: its years, seasons and the
 * first genre ("2002–2008 · 5 seasons · Crime"). The years are the shared
 * format (`formatSeriesYears`): "2014–" while it runs, as the picker,
 * the spotlight and the show page write them.
 */
export default function ShowMeta({
  className,
  series,
}: Readonly<{
  className?: string;
  series: Pick<
    TvSeries,
    | 'firstAirDate'
    | 'genres'
    | 'lastAirDate'
    | 'numberOfSeasons'
    | 'releaseYear'
    | 'status'
  >;
}>) {
  const year = showYears(series);
  const seasons = showSeasons(series);
  return (
    <MetaRow className={className}>
      <MetaItem icon={calendarGlyph}>{year}</MetaItem>
      <MetaItem icon={seasonGlyph}>{seasons}</MetaItem>
      <MetaItem icon={tagGlyph} shrink>
        {firstGenre(series)}
      </MetaItem>
    </MetaRow>
  );
}
