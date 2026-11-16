import type { BecauseYouWatched, TvSeries } from '@tvseri.es/schemas';
import Link from 'next/link';

import { calendarGlyph, seasonGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import PosterArt from '@/components/ui/tile/PosterArt';
import WatchedLabel from '@/components/ui/tile/WatchedLabel';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import showPath from '@/lib/routing/showPath';
import { showSeasons, showYears } from '../../showFacts';

type Source = NonNullable<BecauseYouWatched['source']>;

/** The source's column (its poster's corners are 10px); shared with the placeholder */
export const LIKED_SOURCE =
  'flex w-[140px] shrink-0 flex-col gap-2 [--tile-radius:10px] md:w-[150px] md:gap-3';

const LIKED_SOURCE_META = 'gap-3';

/**
 * The show the card starts from (HMFinal `e3-brs`): its poster (10px
 * corners) with the Watched label, then year and seasons. A finished show is
 * watched by definition; a favourite gets the label from the library.
 */
export default function LikedSource({
  from,
  series,
}: Readonly<{ from: Source['from']; series: TvSeries }>) {
  const year = showYears(series);
  const seasons = showSeasons(series);
  const overlay =
    from === 'watched' ? <WatchedLabel /> : <WatchedOverlay id={series.id} />;
  return (
    <div className={LIKED_SOURCE}>
      <Link
        className="block rounded-10 focus-visible:outline-offset-4"
        href={showPath(series.id, series.slug)}
      >
        <PosterArt
          overlay={overlay}
          poster={series.posterImage}
          sizes="150px"
          title={series.title}
        />
      </Link>
      <MetaRow className={LIKED_SOURCE_META}>
        <MetaItem icon={calendarGlyph}>{year}</MetaItem>
        <MetaItem icon={seasonGlyph}>{seasons}</MetaItem>
      </MetaRow>
    </div>
  );
}
