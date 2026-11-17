import MetaRow from '@/components/ui/meta/MetaRow';
import cn from '@/lib/cn';
import { MAX_SHOWS, type SearchLayout } from '@/lib/search/sections';

import { GRID, overlineClasses, PERSON, SHOW } from './resultLayout';

/** The ghosts' fill: the ink at 7% on the white sheet, static (no shimmer) */
const FILL = 'bg-rk-line';

/** People in a typical answer: one row of four (a strip on a phone) */
const PEOPLE = 4;

/** A text line's box (its type token's line height) with a bar in it */
const LINE = 'flex h-[1lh] items-center';

/** Bars: 10 tall in a 24 line, 8 tall in a 20 line; fully rounded */
const BAR = `block rounded-full ${FILL}`;
const BAR_TEXT = `${BAR} h-2.5`;
const BAR_META = `${BAR} h-2`;

/** Each bar's width, as its line's typical text */
const OVERLINE_BAR = `${BAR_META} w-11`;
const SHOW_TITLE_BAR = `${BAR_TEXT} w-[70%]`;
const SHOW_YEAR_BAR = `${BAR_META} w-13`;
const NAME_LINE = `${LINE} w-[64%]`;
const NAME_BAR = `${BAR_TEXT} w-full`;
const ROLE_BAR = `${BAR_META} w-14`;
const KNOWN_FOR_BAR = `${BAR_META} w-[80%]`;

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Overline({ first }: Readonly<{ first: boolean }>) {
  const classes = cn(overlineClasses(first), LINE);
  return (
    <div className={classes}>
      <span className={OVERLINE_BAR} />
    </div>
  );
}

function ShowGhost() {
  const poster = cn(SHOW.poster, FILL);
  const title = cn(SHOW.title, LINE);
  const year = cn(SHOW.year, 'h-[1lh]');
  return (
    <div className={SHOW.tile} data-ghost="show">
      <span className={poster} />
      <span className={title}>
        <span className={SHOW_TITLE_BAR} />
      </span>
      <MetaRow className={year}>
        <span className={SHOW_YEAR_BAR} />
      </MetaRow>
    </div>
  );
}

function PersonGhost() {
  const face = cn(PERSON.face, 'rounded-full', FILL);
  // On a phone the name line holds two lines: the bar sits in the first
  const name = cn(PERSON.name, 'flex justify-center');
  const role = cn(PERSON.role, 'h-[1lh]');
  const knownFor = cn(PERSON.knownFor, 'h-[1lh]');
  return (
    <div className={PERSON.tile} data-ghost="person">
      <span className={face} />
      <span className={name}>
        <span className={NAME_LINE}>
          <span className={NAME_BAR} />
        </span>
      </span>
      <MetaRow className={role}>
        <span className={ROLE_BAR} />
      </MetaRow>
      <MetaRow className={knownFor}>
        <span className={KNOWN_FOR_BAR} />
      </MetaRow>
    </div>
  );
}

/**
 * The ghost rows: the result rows with their content removed, for
 * a first query that takes longer than 250 ms (nothing related on screen
 * yet). Built from the rows' own grid and line classes (`resultLayout`), so
 * the results fill into the same boxes: a typical first answer, Shows (8
 * posters, 6 on a phone) then People (4). The Enter chip and the Watched
 * label are absolute in the results and take no space, so they have no
 * ghost. Static; fades in over 200 ms.
 */
export default function GhostResults({
  layout,
}: Readonly<{ layout: SearchLayout }>) {
  return (
    <div
      aria-hidden="true"
      className="transition-opacity duration-200 ease-out starting:opacity-0"
    >
      <Overline first />
      <div className={GRID.shows}>
        {range(MAX_SHOWS[layout]).map((i) => (
          <ShowGhost key={i} />
        ))}
      </div>
      <Overline first={false} />
      <div className={GRID.people}>
        {range(PEOPLE).map((i) => (
          <PersonGhost key={i} />
        ))}
      </div>
    </div>
  );
}
