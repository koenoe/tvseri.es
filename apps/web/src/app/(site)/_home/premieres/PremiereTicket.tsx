import type { Premiere } from '@tvseri.es/schemas';
import Image from 'next/image';
import WatchlistToggle from '@/components/marking/WatchlistToggle';
import { calendarGlyph, seasonGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import { TILE_HOVER_WIDE } from '@/components/ui/tile/tileHover';
import TitleTreatment, {
  TITLE_LOGO_FIT,
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';
import type { ControlStatesRead } from '@/lib/marking/controlState';
import showPath from '@/lib/routing/showPath';
import {
  kindLabel,
  kindTone,
  releaseLabel,
  ticketDate,
  ticketLabel,
} from './format';
import TicketStub from './TicketStub';

/** The ticket's frame: the stub column (68, 78 from md) beside the body; shared with the placeholder */
export const TICKET_FRAME =
  'grid w-full grid-cols-[68px_minmax(0,1fr)] overflow-hidden rounded-12 md:grid-cols-[78px_minmax(0,1fr)]';

/**
 * A ticket's width in the row (328, 460 from md). On a phone narrower than
 * the gutter, the ticket, the 12px gap and a 12px peek (384 with the 32px
 * gutter) the ticket gives way so the next one still peeks 12px past the
 * gap; its date and cadence still fit
 */
export const TICKET_WIDTH =
  'w-[min(328px,calc(100vw_-_var(--page-gutter)_-_24px))] shrink-0 md:w-[460px]';

export const TICKET_ART =
  'relative aspect-video overflow-hidden bg-white/4 before:absolute before:inset-0 before:z-1 before:bg-[linear-gradient(20deg,rgb(0_0_0/0.72)_0%,rgb(0_0_0/0.3)_38%,rgb(0_0_0/0)_62%)]';

/** The logo's place, bottom left of the backdrop */
export const TICKET_LOGO =
  'absolute right-16 bottom-3 left-3 z-1 flex h-8 items-end md:bottom-4 md:left-4 md:h-11';

export const TICKET_LOGO_BOX = 'h-8 w-[140px] md:h-11 md:w-[200px]';

/**
 * Under the backdrop: what happens and when, then the Watchlist pill; on a
 * phone the pill takes its own line under the facts (beside them the 260px
 * body would leave the facts about 110px)
 */
export const TICKET_BODY =
  'flex flex-col items-start gap-3 p-3 md:flex-row md:items-center md:p-4';
export const TICKET_LINES = 'flex w-full min-w-0 flex-1 flex-col gap-2';

/** The Watchlist pill sits above the ticket's link, so it doesn't open the show */
const TICKET_ACTION = 'relative z-3';

/**
 * The ticket, the shared picture rim over everything in it (`image-rim`,
 * lifted over the scrim and the stub) and the one tile hover (`tileHover`:
 * a 3% grow, no tint or ring)
 */
const TICKET = `group/ticket image-rim relative ${TICKET_FRAME} bg-white/5 after:z-4 ${TILE_HOVER_WIDE}`;

/** The show's logo in the ticket's logo box (140 × 32, 200 × 44 from md); else its title */
// Each place keeps its own look on purpose; don't unify them.
const TICKET_TITLE: TitleTreatmentLook = {
  height: 44,
  logo: `${TICKET_LOGO_BOX} ${TITLE_LOGO_FIT}`,
  sizes: '200px',
  text: 'truncate text-title-3 text-white',
  width: 200,
};

const BACKDROP_SIZES = '(min-width: 768px) 382px, 260px';

/**
 * One Premieres ticket (the profile's Coming up ticket):
 * the countdown stub, a dashed tear, the backdrop with the logo under a
 * scrim, then what happens, the date and
 * the release, and the Watchlist pill. The whole ticket opens the show.
 */
export default function PremiereTicket({
  premiere,
  states,
}: Readonly<{ premiere: Premiere; states?: ControlStatesRead }>) {
  const { series } = premiere;
  const tone = kindTone(premiere.kind);
  const kindClass = cn(
    'truncate text-caption font-medium',
    tone === 'cyan' ? 'text-cyan' : 'text-pink',
  );
  const label = ticketLabel(premiere);
  const href = showPath(series.id, series.slug);
  return (
    <article className={TICKET} data-hairline>
      <TileLink
        aria-label={label}
        className="absolute inset-0 z-2 rounded-[inherit] focus-visible:outline-offset-4"
        href={href}
      />
      <TicketStub daysAway={premiere.daysAway} tone={tone} />
      <div className="flex min-w-0 flex-col">
        <div className={TICKET_ART}>
          {series.backdropImage ? (
            <Image
              alt=""
              className="object-cover object-[center_25%]"
              fill
              sizes={BACKDROP_SIZES}
              src={series.backdropImage}
            />
          ) : null}
          <span className={TICKET_LOGO}>
            <TitleTreatment
              look={TICKET_TITLE}
              src={series.titleTreatmentImage}
              title={series.title}
            />
          </span>
        </div>
        <div className={TICKET_BODY}>
          <div className={TICKET_LINES}>
            <span className={kindClass}>
              {kindLabel(premiere.kind, premiere.seasonNumber)}
            </span>
            <MetaRow>
              <MetaItem icon={calendarGlyph} shrink>
                {ticketDate(premiere.date, premiere.daysAway)}
              </MetaItem>
              <MetaItem icon={seasonGlyph} shrink>
                {releaseLabel(premiere.release)}
              </MetaItem>
            </MetaRow>
          </div>
          <WatchlistToggle
            className={TICKET_ACTION}
            id={series.id}
            states={states}
            title={series.title}
          />
        </div>
      </div>
    </article>
  );
}
