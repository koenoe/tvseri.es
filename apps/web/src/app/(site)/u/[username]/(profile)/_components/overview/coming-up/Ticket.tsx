import type { ComingUpItem } from '@tvseri.es/schemas';
import CodeBadge from '@/components/ui/button/CodeBadge';
import { bookmarkGlyph, calendarGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import ServiceIcon, {
  type ServiceIconLayout,
} from '@/components/ui/service/ServiceIcon';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { formatAirWeekdayDate } from '@/lib/format/airDate';
import showPath from '@/lib/routing/showPath';
import LanePoster from '../../blocks/LanePoster';
import { countdown, type TicketText } from './tickets';

/** The ticket's grid, its stub and its body (the ghost ticket takes the same) */
export const TICKET_GRID =
  'relative grid min-h-[84px] grid-cols-[78px_minmax(0,1fr)] rounded-12 bg-white/5';
export const TICKET_STUB =
  'flex flex-col items-center justify-center gap-1 rounded-l-12';
export const TICKET_BODY =
  'relative flex min-w-0 items-start gap-3.5 px-4 py-3.5';
/** The date line's watchlist tag follows the text column's width */
export const TICKET_TEXT = 'flex min-w-0 flex-1 flex-col gap-2 @container';

/**
 * The date's line. "On your watchlist" sits at its end. Where the line is
 * tight (a 416px lane) it follows the date and may run up to 12px into the
 * ticket's padding, as on the board; where even that is too narrow it takes
 * a line of its own, never cut
 */
export const ticketDateLine = (onWatchlist: boolean) =>
  cn(
    'mt-0.5',
    onWatchlist &&
      'flex-wrap justify-between gap-2 @max-[240px]:-mr-3 @max-[240px]:max-w-none @max-[240px]:justify-start',
  );

/** The watchlist tag's words and box, without its look (the ghost tag takes the same) */
export const WATCHLIST_LABEL = 'On your watchlist';
export const WATCHLIST_TAG =
  'inline-flex min-w-0 max-w-full shrink-0 items-center gap-1 whitespace-normal rounded-[5px] px-[7px] py-0.5 text-caption';
const WATCHLIST_TAG_CLASS = cn(WATCHLIST_TAG, 'bg-black/10 text-white/60');

/** The punched notches either side of the tear and the hover */
const TICKET_LOOK =
  'transition-colors hover:bg-white/8 before:absolute before:-top-[7px] before:left-[71px] before:size-3.5 before:rounded-full before:bg-ground-deep after:absolute after:-bottom-[7px] after:left-[71px] after:size-3.5 after:rounded-full after:bg-ground-deep';

const TICKET_CLASS = cn(TICKET_GRID, TICKET_LOOK);

/** Each place keeps its own look on purpose; don't unify them. */
const PROVIDER: ServiceIconLayout = {
  className: 'absolute top-3 right-4 size-5 rounded-6 max-md:hidden',
  size: 20,
};

const STUB = {
  episode: '',
  finale: 'bg-[rgb(0_255_255/0.05)] [&_.sn]:text-cyan',
  premiere: 'bg-[rgb(255_0_128/0.07)] [&_.sn]:text-pink',
} as const;

/**
 * One ticket: the countdown stub behind a dashed tear with two punched
 * notches, then poster, title, what airs, the date, and where. On a phone
 * the service's logo drops: beside it the title would be cut to a few
 * letters, and on the date line it would cut the date.
 */
export default function Ticket({
  item,
  now,
  text,
}: Readonly<{ item: ComingUpItem; now: number; text: TicketText }>) {
  const { n, unit } = countdown(item.daysToGo);
  const href = showPath(item.seriesId, item.slug);
  const stub = cn(
    TICKET_STUB,
    'border-r-2 border-dashed border-white/14',
    STUB[text.kind],
  );
  const labelClass = cn(
    'truncate text-caption font-medium',
    text.kind === 'finale' ? 'text-cyan' : 'text-pink-light',
  );
  const dateLine = ticketDateLine(item.onWatchlist);
  return (
    <TileLink className={TICKET_CLASS} href={href}>
      <span className={stub}>
        {n ? (
          <span className="sn text-title-3 tabular-nums text-white">{n}</span>
        ) : null}
        <span className="text-overline uppercase text-white/60">{unit}</span>
      </span>
      <span className={TICKET_BODY}>
        <LanePoster src={item.posterImage} width={36} />
        <span className={TICKET_TEXT}>
          <span
            className="min-w-0 truncate pr-8 text-body-sm font-semibold max-md:pr-0"
            title={item.title}
          >
            {item.title}
          </span>
          {/* one line: the note drops whole first, then the label */}
          <MetaRow className="gap-2" fit="drop">
            {text.badge ? <CodeBadge code={text.badge} size="lane" /> : null}
            {text.label ? (
              <span className={labelClass}>{text.label}</span>
            ) : null}
            {text.note ? (
              <span className="truncate text-caption text-white/60">
                {text.note}
              </span>
            ) : null}
          </MetaRow>
          <MetaRow className={dateLine}>
            <MetaItem icon={calendarGlyph}>
              {formatAirWeekdayDate(item.date, now)}
            </MetaItem>
            {item.onWatchlist ? (
              <span className={WATCHLIST_TAG_CLASS}>
                <Icon active glyph={bookmarkGlyph} size={12} />
                {WATCHLIST_LABEL}
              </span>
            ) : null}
          </MetaRow>
        </span>
        {item.provider ? (
          <ServiceIcon
            alt={item.provider.name}
            layout={PROVIDER}
            logo={item.provider.logoImage}
            title={item.provider.name}
          />
        ) : null}
      </span>
    </TileLink>
  );
}
