import type { NewRelease } from '@tvseri.es/schemas';
import {
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
  trendingGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import {
  BACKDROP_FRAME,
  BackdropImage,
} from '@/components/ui/tile/BackdropTile';
import TileLink from '@/components/ui/tile/TileLink';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import TitleTreatment, {
  TITLE_LOGO_FIT,
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';
import showPath from '@/lib/routing/showPath';

import { firstGenre } from '../genres';
import { LEAD_COLUMN, LEAD_HEIGHT, LEAD_SIZES } from './layout';

const FRAME = cn(BACKDROP_FRAME, LEAD_HEIGHT);

/** The Watched label's place, as on a poster (`PosterArt`) */
const OVERLAY = 'absolute top-2 left-2 z-2 md:top-2.5 md:left-2.5';

/** The logo or the title, bottom left: 16px in on phones, 24 (22 up) on desktop */
const MARK =
  'absolute right-4 bottom-4 left-4 z-2 flex items-end md:right-6 md:bottom-5.5 md:left-6';

/** The design's logo box: up to 300 × 56, never past 60% of the tile */
const LOGO_BOX = 'relative block h-14 w-[min(300px,60%)]';

/** Without a logo, the title written large */
const TITLE_TEXT = 'line-clamp-2 text-title-2 text-white';

/**
 * What the lead says under it: its genre, the year a new series started or
 * the season a returning one is on (the first season's year would read as
 * old in a row of new things), and its place among the week's premieres.
 */
function LeadMeta({ release }: Readonly<{ release: NewRelease }>) {
  const when =
    release.kind === 'new-season' ? (
      <MetaItem icon={seasonGlyph}>{`Season ${release.seasonNumber}`}</MetaItem>
    ) : (
      <MetaItem icon={calendarGlyph}>{release.date.slice(0, 4)}</MetaItem>
    );
  return (
    <MetaRow fit="drop">
      <MetaItem icon={tagGlyph} shrink>
        {firstGenre(release.series)}
      </MetaItem>
      {when}
      <MetaItem icon={trendingGlyph} tone="highlight">
        {`#${release.rank} this week`}
      </MetaItem>
    </MetaRow>
  );
}

/** The show's logo in the lead tile's box, else its title written */
// Each place keeps its own look on purpose; don't unify them.
const LEAD_TITLE_LOOK: TitleTreatmentLook = {
  box: LOGO_BOX,
  logo: TITLE_LOGO_FIT,
  sizes: '300px',
  text: TITLE_TEXT,
};

/**
 * New this week's first tile: the show's backdrop, as tall as the posters
 * beside it, with its logo (or its title) bottom left over the backdrop
 * tile's shade, and the meta line under it. Built from the backdrop tile's
 * own frame and image (`BackdropTile`), so it hovers and focuses as one.
 * Below the fold on every viewport: its images load lazily.
 */
export default function LeadTile({
  release,
}: Readonly<{ release: NewRelease }>) {
  const { series } = release;
  return (
    <div className={LEAD_COLUMN}>
      <TileLink
        className={FRAME}
        data-hairline
        href={showPath(series.id, series.slug)}
      >
        <BackdropImage backdrop={series.backdropImage} sizes={LEAD_SIZES} />
        <span className={OVERLAY}>
          <WatchedOverlay id={series.id} />
        </span>
        <span className={MARK}>
          <TitleTreatment
            look={LEAD_TITLE_LOOK}
            src={series.titleTreatmentImage || undefined}
            title={series.title}
          />
        </span>
      </TileLink>
      <LeadMeta release={release} />
    </div>
  );
}
