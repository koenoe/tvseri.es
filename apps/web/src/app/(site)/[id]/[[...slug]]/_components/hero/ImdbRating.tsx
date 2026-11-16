import { starGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import { formatScore } from '@/lib/format/rating';

import { loadRating } from '../../_data/loaders';

const votesFormat = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
  notation: 'compact',
});

/** "330K": the vote count as the board writes it. */
const formatVotes = (votes: number) => votesFormat.format(votes);

const IMDB_URL = 'https://www.imdb.com/title/';

/**
 * The value and the votes sit close ("too much spacing", then
 * on desktop "way too close"): line boxes as tall as the type (22px under a
 * 24px value, so its baseline is the box's bottom; 18px on phones). On
 * phones no margin, so the vote count starts about 4px under the value's
 * digits; on desktop a 4px margin puts it about 8px under them (the board's
 * 17px was the first "too much").
 */
const VALUE =
  'block font-semibold text-[18px] leading-[18px] tabular-nums md:text-[24px] md:leading-[22px]';
const VOTES = 'block text-caption/none text-white/60 tabular-nums md:mt-1';
/**
 * The value's line, at least as wide as the placeholder's bar, so the
 * buttons beside the badge sit where they will (a rated or unrated badge)
 */
const VALUE_LINE = 'flex min-w-[55px] items-baseline gap-1 md:min-w-[65px]';
const BADGE = 'inline-flex items-center gap-2.5';
const STAR = 'size-5 shrink-0 md:size-6';
const OUT_OF = 'text-body-sm/none text-white/60';

const imdbHref = (imdbId: string) => `${IMDB_URL}${imdbId}/`;

/**
 * The show's IMDb rating: a filled star, "8.5 / 10" and the votes under it
 * (ep-imdb; 20px star and 18px value on phones). Links to IMDb
 * when the show has an IMDb id; no vote line without votes (never "0").
 * Without a rating (IMDb has none, or the ratings read failed) a show with
 * an IMDb id gets the same badge greyed out, "– / 10" over "No rating", in
 * the same box and still a link to the title on IMDb; one without an IMDb
 * id gets nothing.
 */
export default async function ImdbRating({
  imdbId,
  seriesId,
}: Readonly<{ imdbId: string | null; seriesId: number }>) {
  const rating = await loadRating(seriesId);
  if (isUnavailable(rating) || !rating) {
    // Nothing at all without a link, so the actions' cell collapses
    // (`HERO_RATING_CELL`) and the buttons sit flush left
    return imdbId ? <UnratedBadge imdbId={imdbId} /> : null;
  }
  return (
    <RatedBadge imdbId={imdbId} value={rating.value} votes={rating.votes} />
  );
}

/** A rating to show: the yellow star, "8.5 / 10" and the votes */
export function RatedBadge({
  imdbId,
  value: rated,
  votes: count,
}: Readonly<{ imdbId: string | null; value: number; votes: number }>) {
  const value = formatScore(rated);
  const votes = formatVotes(count);
  const body = (
    <>
      <Icon
        active
        className={`${STAR} text-[#fde047]`}
        glyph={starGlyph}
        size={24}
      />
      <span>
        <span className={VALUE_LINE}>
          <b className={VALUE}>{value}</b>
          <span className={OUT_OF}>/ 10</span>
        </span>
        {count > 0 ? <small className={VOTES}>{votes}</small> : null}
      </span>
    </>
  );
  const label =
    count > 0
      ? `IMDb rating ${value} out of 10, ${votes} votes`
      : `IMDb rating ${value} out of 10`;
  return imdbId ? (
    <a
      aria-label={label}
      className={`${BADGE} text-white`}
      data-slot="imdb"
      href={imdbHref(imdbId)}
      rel="noopener noreferrer"
      target="_blank"
    >
      {body}
    </a>
  ) : (
    <span aria-label={label} className={BADGE} data-slot="imdb" role="img">
      {body}
    </span>
  );
}

/** No rating to show: the badge greyed out, a way to look it up on IMDb */
export function UnratedBadge({ imdbId }: Readonly<{ imdbId: string }>) {
  return (
    <a
      aria-label="Rating unavailable. Open on IMDb"
      className={`${BADGE} text-white/60 transition-colors hover:text-white/80`}
      data-slot="imdb"
      data-unrated=""
      href={imdbHref(imdbId)}
      rel="noopener noreferrer"
      target="_blank"
    >
      {/* contrast-exempt: the greyed-out star, decorative */}
      <Icon className={`${STAR} text-white/40`} glyph={starGlyph} size={24} />
      <span>
        <span className={VALUE_LINE}>
          <b className={VALUE}>–</b>
          <span className={OUT_OF}>/ 10</span>
        </span>
        <small className={VOTES}>No rating</small>
      </span>
    </a>
  );
}

/**
 * The rating's space while it loads: flat ghosts for the star, the value and
 * the votes (the votes' 12px line, 8px bar, as far under the value as the
 * loaded one), one pulsing layer.
 */
export function ImdbRatingSkeleton() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex animate-ghost items-center gap-2.5"
      data-placeholder="imdb"
    >
      <span className={`size-5 rounded-full md:size-6 ${GHOST_FILL}`} />
      <span className="flex flex-col gap-1 md:gap-2">
        <span
          className={`h-[18px] w-[55px] rounded-4 md:h-[22px] md:w-[65px] ${GHOST_FILL}`}
        />
        <span className={`h-2 w-9 rounded-4 ${GHOST_FILL}`} />
      </span>
    </span>
  );
}
