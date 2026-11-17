import type { Person } from '@tvseri.es/schemas';
import type { CSSProperties, ReactNode } from 'react';
import {
  calendarGlyph,
  chevronRightGlyph,
  clockGlyph,
  filmGlyph,
  micGlyph,
  seasonGlyph,
  userGlyph,
  usersGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';
import SectionUnavailable from '@/components/ui/row/SectionUnavailable';
import SectionHead from '@/components/ui/section/SectionHead';
import TileLink from '@/components/ui/tile/TileLink';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';
import { loadCareerView, loadShowsView } from '../../_data/loaders';
import {
  type CaptionPlace,
  type CareerView,
  GUEST_CAPTION_GAP,
} from '../../_lib/career';
import { allSeriesLabel } from '../../_lib/format';
import { PERSON_LANE, PERSON_SECTION } from '../layout';
import { CareerSkeleton } from '../Skeletons';
import { SECTION_LINK } from '../sectionLink';
import { barStyle, WEIGHT } from './bars';
import { AllSeriesButton, GuestRowButton } from './CareerButtons';
import { CareerKeyBlock, CareerKeyInline } from './CareerKey';
import CareerMarks from './CareerMarks';
import CareerTouch from './CareerTouch';
import styles from './career.module.css';

/** The chart's lane */
const LANE = cn(PERSON_LANE, 'px-4 pt-4 pb-3 lg:px-6 lg:pt-5 lg:pb-4');

/** Label column 104px (phone) / 168px (desktop), 12 / 16px to the track */
const COLUMNS =
  'grid grid-cols-[104px_minmax(0,1fr)] gap-3 lg:grid-cols-[168px_minmax(0,1fr)] lg:gap-4';
/**
 * A row's highlight reaches 8px (phone) / 12px (desktop) past its label and
 * track, into the lane's padding; the negative margin keeps every label and
 * bar where the columns put them.
 */
const ROW = cn(
  styles.row,
  COLUMNS,
  '-mx-2 px-2 lg:-mx-3 lg:px-3 h-[52px] items-center rounded-8 lg:h-[30px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70',
);
/** The guest button's width: the lane's, plus the row's two overhangs */
const GUEST_ROW =
  'w-[calc(100%+16px)] cursor-pointer text-left lg:w-[calc(100%+24px)]';
const TRACK = 'relative h-[52px] lg:h-[30px]';
const CAPTION = cn(
  styles.cap,
  'absolute top-1.5 hidden h-[18px] items-center gap-3 rounded-6 bg-[#161b1c] px-2 text-caption whitespace-nowrap text-white/80 lg:flex',
);
const LABEL =
  'block truncate text-body-sm font-medium text-white/80 lg:font-normal';
const SUB = 'text-caption text-white/60 tabular-nums lg:hidden';

const captionStyle = (at: CaptionPlace): CSSProperties => {
  if (at.side === 'over') {
    return { right: 0 };
  }
  return at.side === 'after'
    ? { left: `calc(${at.left}% + 8px)` }
    : { right: `calc(${at.right}% + 8px)` };
};

function CaptionItem({
  children,
  icon,
}: Readonly<{ children: ReactNode; icon: Glyph }>) {
  return (
    <span className="inline-flex items-center gap-[5px]">
      <Icon className="shrink-0" glyph={icon} size={12} />
      {children}
    </span>
  );
}

function Axis({ view }: Readonly<{ view: CareerView }>) {
  const { marker } = view;
  const markerClass = marker.died
    ? 'translate-x-[calc(-100%-6px)] text-white/60'
    : '-translate-x-1/2 font-medium text-white';
  return (
    <>
      <div aria-hidden="true" className={cn(COLUMNS, 'h-6')}>
        <span />
        <span className="relative">
          {view.axis.desktop.map((tick) => (
            <span
              className="absolute top-0 hidden -translate-x-1/2 text-caption whitespace-nowrap text-white/60 tabular-nums lg:block"
              key={tick.label}
              style={{ left: `${tick.at}%` }}
            >
              {tick.label}
            </span>
          ))}
          {view.axis.phone.map((tick) => (
            <span
              className="absolute top-0 -translate-x-1/2 text-caption whitespace-nowrap text-white/60 tabular-nums lg:hidden"
              key={tick.label}
              style={{ left: `${tick.at}%` }}
            >
              {tick.label}
            </span>
          ))}
          <span
            className={cn(
              styles.dim,
              'absolute top-0 text-caption whitespace-nowrap',
              markerClass,
            )}
            style={{ left: `${marker.at}%` }}
          >
            {marker.label}
          </span>
        </span>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-6 right-0 bottom-0 left-[116px] lg:left-[184px]"
      >
        {view.grid.map((at) => (
          <i
            className="absolute top-0 bottom-0 w-px bg-white/5"
            key={at}
            style={{ left: `${at}%` }}
          />
        ))}
        <i
          className="absolute top-0 bottom-0 w-px bg-white/28"
          style={{ left: `${marker.at}%` }}
        />
      </span>
    </>
  );
}

function Rows({
  personId,
  view,
}: Readonly<{ personId: number; view: CareerView }>) {
  return (
    <>
      {view.rows.map((row) => (
        <TileLink
          className={ROW}
          data-career-row=""
          href={row.href}
          key={row.id}
        >
          <span className="flex min-w-0 flex-col gap-px pl-1 lg:block lg:pl-2">
            <span className={cn(styles.name, LABEL)}>{row.name}</span>
            <span className="sr-only">{row.details}</span>
            <span aria-hidden="true" className={SUB}>
              {row.years}
            </span>
          </span>
          <span className={TRACK}>
            <CareerMarks
              bar={row.bar}
              personId={personId}
              runs={row.runs}
              seriesId={row.id}
              weight={row.weight}
            />
            <span
              aria-hidden="true"
              className={CAPTION}
              style={captionStyle(row.caption)}
            >
              <CaptionItem icon={row.voice ? micGlyph : userGlyph}>
                {row.role}
              </CaptionItem>
              <CaptionItem icon={seasonGlyph}>{row.episodes}</CaptionItem>
              <CaptionItem icon={calendarGlyph}>{row.years}</CaptionItem>
            </span>
          </span>
        </TileLink>
      ))}
      {view.upcoming.map((row) => {
        const style = { right: `calc(${row.captionRight}% + 4px)` };
        return (
          <TileLink
            className={ROW}
            data-career-row=""
            href={row.href}
            key={row.id}
          >
            <span className="flex min-w-0 flex-col gap-px pl-1 lg:block lg:pl-2">
              <span className={cn(styles.name, LABEL)}>{row.name}</span>
              <span className="sr-only">{row.details}</span>
              <span aria-hidden="true" className={cn(SUB, 'text-pink')}>
                {row.when}
              </span>
            </span>
            <span className={TRACK}>
              <i
                className={cn(
                  'absolute bg-linear-to-r from-pink to-pink/0',
                  WEIGHT[2],
                )}
                style={barStyle(row.bar.start, row.bar.end, 1)}
              />
              <span
                aria-hidden="true"
                className={cn(CAPTION, styles.capOn, 'text-pink')}
                style={style}
              >
                <CaptionItem icon={filmGlyph}>{row.role}</CaptionItem>
                <CaptionItem icon={clockGlyph}>{row.when}</CaptionItem>
                <CaptionItem icon={calendarGlyph}>{row.date}</CaptionItem>
              </span>
            </span>
          </TileLink>
        );
      })}
    </>
  );
}

function GuestRow({
  personId,
  view,
}: Readonly<{ personId: number; view: NonNullable<CareerView['guest']> }>) {
  const style =
    view.caption.side === 'after'
      ? { left: `calc(${view.caption.left}% + ${GUEST_CAPTION_GAP}px)` }
      : { right: 0 };
  return (
    <GuestRowButton
      aria={view.aria}
      className={cn(ROW, GUEST_ROW)}
      personId={personId}
    >
      <span className="flex min-w-0 flex-col gap-px pl-1 lg:block lg:pl-2">
        <span className="block truncate text-body-sm font-medium text-white/60 lg:font-normal">
          Guest roles
          <small className="ml-1.5 hidden text-caption text-white/60 tabular-nums lg:inline">
            {view.count}
          </small>
        </span>
        <span className={SUB}>
          {view.count}, {view.years}
        </span>
      </span>
      <span className={TRACK}>
        {view.ticks.map((at, index) => (
          <i
            className="absolute top-[15px] h-2.5 w-0.5 rounded-[1px] bg-white/38 lg:top-2.5"
            key={index}
            style={{ left: `calc(${at}% - 1px)` }}
          />
        ))}
        <span aria-hidden="true" className={CAPTION} style={style}>
          <CaptionItem icon={usersGlyph}>
            {view.count} one-off roles
          </CaptionItem>
          <CaptionItem icon={calendarGlyph}>{view.years}</CaptionItem>
        </span>
      </span>
    </GuestRowButton>
  );
}

/**
 * Career ("How the career works"): a
 * server-drawn chart, one row per series, the viewer's stretches filled
 * (client marks), Today or the date of death, announced work in pink past
 * Today, guest roles as ticks. Rows link to the show; a first tap on touch
 * lights the row.
 */
export default async function Career({
  person,
}: Readonly<{ person: Pick<Person, 'deathdate' | 'gender' | 'id'> }>) {
  const [view, shows] = await Promise.all([
    loadCareerView(person.id, person.deathdate),
    loadShowsView(person.id, person.gender),
  ]);
  if (isUnavailable(view)) {
    return (
      <SectionUnavailable
        id="person-career"
        inset="flush"
        placeholder={<CareerSkeleton />}
        title="Career"
      />
    );
  }
  if (!view) {
    return null;
  }
  const series = shows && !isUnavailable(shows) ? shows.counts.series : 0;
  const chevron = <Icon glyph={chevronRightGlyph} size={14} />;
  // The key lists only marks on screen: none when there are only guest ticks
  const hasBars = view.rows.length + view.upcoming.length > 0;
  const headLink = (
    <>
      {hasBars ? <CareerKeyInline personId={person.id} /> : null}
      {series > 0 ? (
        <AllSeriesButton
          className={cn(SECTION_LINK, 'cursor-pointer lg:hidden')}
          personId={person.id}
        >
          {allSeriesLabel(series, 'short')}
          {chevron}
        </AllSeriesButton>
      ) : null}
    </>
  );

  return (
    <section
      aria-labelledby="person-career"
      className={PERSON_SECTION}
      data-slot="person-career"
    >
      <SectionHead id="person-career" link={headLink} title="Career" />
      {hasBars ? <CareerKeyBlock personId={person.id} /> : null}
      <div className={LANE}>
        <CareerTouch>
          <Axis view={view} />
          <Rows personId={person.id} view={view} />
          {view.guest ? (
            <>
              <div className="my-2 h-px bg-white/6" />
              <GuestRow personId={person.id} view={view.guest} />
            </>
          ) : null}
        </CareerTouch>
        {series > 0 ? (
          <div className="mt-2 hidden justify-end border-t border-white/6 pt-3 lg:flex">
            <AllSeriesButton
              className={cn(SECTION_LINK, 'cursor-pointer')}
              personId={person.id}
            >
              {allSeriesLabel(series, 'long')}
              {chevron}
            </AllSeriesButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}
