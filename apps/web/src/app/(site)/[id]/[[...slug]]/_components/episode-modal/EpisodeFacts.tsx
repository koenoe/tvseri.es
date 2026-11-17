'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { formatDuration } from '@tvseri.es/utils';
import { memo } from 'react';

import { PULSE } from '@/components/ui/ghost/ghosts';
import {
  calendarGlyph,
  clockGlyph,
  seasonGlyph,
  starGlyph,
  tagGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import {
  type TitleLogoLook,
  TitleTreatmentLogo,
} from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';
import { ratingLabel } from '@/lib/series/episodeRatings';
import type { ShowSeason } from '../../_lib/show';
import { formatAirDate } from '../episodes/format';
import { positionLabel } from './episodeSteps';
import { useSeasonRatings } from './useEpisodeData';

type Props = Readonly<{
  seriesId: number;
  episode: EpisodeRef;
  seasons: ReadonlyArray<ShowSeason>;
  showTitle: string;
  logo: string;
  title: string;
  airDate: string;
  runtime: number;
  /** The season's episodes are still loading: bars stand in for the title and facts. */
  loading?: boolean;
}>;

const runtimeLabel = (minutes: number) =>
  minutes > 0 ? formatDuration(minutes) : '';

/** Film-title scale; long titles step down so they stay within ~3 lines. */
const titleSize = (title: string) =>
  title.length > 28
    ? 'text-[64px]'
    : title.length > 16
      ? 'text-[80px]'
      : 'text-[104px]';

const FACT_GHOST = cn(
  'inline-block h-3 w-20 rounded-4 align-middle',
  GHOST_FILL,
  PULSE,
);
const TITLE_GHOST = cn(
  'block h-[96px] w-[420px] max-w-full rounded-12 max-lg:h-8 max-lg:w-[220px]',
  GHOST_FILL,
  PULSE,
);

/** A quiet bar where a fact will be (the season is still loading). */
/** The show's logo above the facts, 180 × 29 on its left (desktop only) */
// Each place keeps its own look on purpose; don't unify them.
const EPISODE_LOGO: TitleLogoLook = {
  height: 29,
  logo: 'h-[29px] w-[180px] object-contain object-left opacity-90 max-lg:hidden',
  sizes: '180px',
  width: 180,
};

function FactBar() {
  return <span aria-hidden="true" className={FACT_GHOST} />;
}

/**
 * The left column's facts: the show's logo, "Season 3 · Episode 5 of
 * 10", the title at 104px, then air date · runtime · the episode's IMDb
 * rating (the only place it shows; "No rating" with a greyed-out star when
 * IMDb has none), the star
 * #fde047 and the line at 80% (12px star on
 * phones). Phones drop the logo and the air date.
 */
function EpisodeFacts({
  airDate,
  episode,
  loading = false,
  logo,
  runtime,
  seasons,
  seriesId,
  showTitle,
  title,
}: Props) {
  const ratings = useSeasonRatings(seriesId, episode.seasonNumber);
  const rating = ratingLabel(ratings, episode.episodeNumber);
  const position = positionLabel(seasons, episode);
  const season =
    episode.seasonNumber === 0 ? 'Specials' : `Season ${episode.seasonNumber}`;
  // The size first: tailwind-merge drops a line height set before a size.
  const titleClasses = cn(
    titleSize(title),
    'm-0 text-balance font-bold leading-[0.92] tracking-[-0.045em]',
    'max-lg:font-semibold max-lg:text-[24px] max-lg:leading-8 max-lg:tracking-normal',
  );

  return (
    <>
      {logo ? (
        <TitleTreatmentLogo look={EPISODE_LOGO} src={logo} title={showTitle} />
      ) : null}
      <MetaRow className="max-lg:gap-3">
        <MetaItem icon={seasonGlyph}>{season}</MetaItem>
        <MetaItem icon={tagGlyph}>{position}</MetaItem>
      </MetaRow>
      {loading ? (
        <h2 className={titleClasses}>
          <span className="sr-only">{title}</span>
          <span
            aria-hidden="true"
            className={TITLE_GHOST}
            data-placeholder="episode-title"
          />
        </h2>
      ) : (
        <h2 className={titleClasses} data-slot="episode-title">
          {title}
        </h2>
      )}
      <MetaRow className="max-lg:gap-3">
        <MetaItem className="max-lg:hidden" icon={calendarGlyph}>
          {loading ? <FactBar /> : formatAirDate(airDate)}
        </MetaItem>
        <MetaItem icon={clockGlyph}>
          {loading ? <FactBar /> : runtimeLabel(runtime)}
        </MetaItem>
        {/* While it loads, a quiet bar like the other facts: never a star
            without its number. The rating ends the line, so its
            arrival moves nothing. */}
        {ratings === undefined ? <FactBar /> : <Rating rating={rating} />}
      </MetaRow>
    </>
  );
}

// contrast-exempt: the greyed-out star, decorative
const UNRATED_STAR = 'text-white/40 max-lg:size-3';

/**
 * The episode's IMDb rating: the yellow star and "9.6 IMDb". Without one
 * (IMDb has none, or the ratings read failed) the show page's unrated look
 * on one line: the star as an outline, greyed out, and "No rating".
 */
function Rating({ rating }: Readonly<{ rating: string | null }>) {
  if (rating === null) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1.5 text-white/60"
        data-unrated=""
      >
        <Icon className={UNRATED_STAR} glyph={starGlyph} size={13} />
        <span>No rating</span>
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-white/80">
      <Icon
        active
        className="text-[#fde047] max-lg:size-3"
        glyph={starGlyph}
        size={13}
      />
      <span>{`${rating} IMDb`}</span>
    </span>
  );
}

const MemoEpisodeFacts = memo(EpisodeFacts);
MemoEpisodeFacts.displayName = 'EpisodeFacts';
export default MemoEpisodeFacts;
