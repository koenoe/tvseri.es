import type {
  PersonCareer,
  PersonCareerRow,
  PersonCareerWeight,
} from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';
import showPath from '@/lib/routing/showPath';

import { formatDay, formatMonthDay, yearSpan } from './format';
import { VOICE_ROLE } from './shows';

/**
 * The Career chart's layout: one row per series, years across, positions in % of the track
 * so the same server HTML fits the 620px desktop track and the 210px phone
 * track. A linear year scale is all it needs.
 */

/** Nine series are shown, with a link "All N series" for the rest */
const CAREER_ROWS = 9;
const UPCOMING_ROWS = 2;

/** Track widths in px at a 1440px desktop and a 390px phone, for text fits */
export const TRACK = { desktop: 620, phone: 210 } as const;
/** Inter 12px, about this wide per character */
const CHAR = { desktop: 6.6, phone: 5.6 } as const;

export type Tick = Readonly<{ at: number; label: string }>;

export type Bar = Readonly<{ start: number; end: number }>;

export type CaptionPlace =
  | Readonly<{ side: 'after'; left: number }>
  | Readonly<{ side: 'before'; right: number }>
  /** No room on either side: on the bar, against the track's end */
  | Readonly<{ side: 'over' }>;

export type CareerRowView = Readonly<{
  id: number;
  href: string;
  name: string;
  role: string;
  voice: boolean;
  weight: PersonCareerWeight;
  episodes: string;
  years: string;
  /** The whole extent (first year to the end of the last), for labels */
  bar: Bar;
  /** The stretches it aired: a gap year breaks the bar (Sneaky Pete) */
  runs: ReadonlyArray<Bar>;
  caption: CaptionPlace;
  /** Read after the name (the caption is visual only): ": role, episodes, years" */
  details: string;
}>;

export type CareerUpcomingView = Readonly<{
  id: number;
  href: string;
  name: string;
  role: string;
  /** "In development" or "Premieres Jun 12" */
  when: string;
  /** "No date yet" or the year */
  date: string;
  bar: Bar;
  /** The caption stays on, left of the marker (% from the right) */
  captionRight: number;
  /** Read after the name: ": role, when, date" */
  details: string;
}>;

export type CareerGuestView = Readonly<{
  count: number;
  years: string;
  ticks: ReadonlyArray<number>;
  /** Where the caption sits: after the tick that opens the widest gap, or at the track's end where it would run past it */
  caption: CaptionPlace;
  aria: string;
}>;

export type CareerView = Readonly<{
  axis: Readonly<{
    desktop: ReadonlyArray<Tick>;
    phone: ReadonlyArray<Tick>;
  }>;
  grid: ReadonlyArray<number>;
  marker: Readonly<{ at: number; label: string; died: boolean }>;
  rows: ReadonlyArray<CareerRowView>;
  upcoming: ReadonlyArray<CareerUpcomingView>;
  guest: CareerGuestView | null;
}>;

type Options = Readonly<{
  /** Now, as a fractional year (inside the cached loader, never at render) */
  today: number;
  /** The date of death, `YYYY-MM-DD`: the marker replaces Today */
  deathdate?: string;
  deathYear?: number | null;
  /** Shows to keep first when picking rows (Known for) */
  preferIds?: ReadonlyArray<number>;
}>;

/** Nine rows: Known for first, then the most episodes; oldest start first. */
export function pickRows(
  rows: ReadonlyArray<PersonCareerRow>,
  preferIds: ReadonlyArray<number> = [],
  limit = CAREER_ROWS,
): ReadonlyArray<PersonCareerRow> {
  const rank = (row: PersonCareerRow) => {
    const index = preferIds.indexOf(row.id);
    return index === -1 ? preferIds.length : index;
  };
  return [...rows]
    .sort((a, b) => rank(a) - rank(b) || b.episodeCount - a.episodeCount)
    .slice(0, limit)
    .sort(
      (a, b) => a.startYear - b.startYear || b.episodeCount - a.episodeCount,
    );
}

/** Longer than this, a name won't fit the 168px label column */
const LONG_NAME = 24;

/**
 * "Malcolm in the Middle: Life's Still Unfair" next to "Malcolm in the
 * Middle" reads "Life's Still Unfair"; a name that fits stays
 * whole ("Bosch: Legacy").
 */
function shortName(name: string, names: ReadonlySet<string>): string {
  const index = name.indexOf(': ');
  if (
    name.length <= LONG_NAME ||
    index === -1 ||
    !names.has(name.slice(0, index))
  ) {
    return name;
  }
  return name.slice(index + 2);
}

/**
 * Where a label of `width` px goes: after the bar if it fits, else before
 * it, else (a bar that fills the track) on the bar at the track's end.
 */
export function besideBar(
  bar: Bar,
  width: number,
  track: number,
  limit: number = track,
  gap = 8,
): CaptionPlace {
  const end = (bar.end / 100) * track;
  if (end + gap + width <= limit) {
    return { left: bar.end, side: 'after' };
  }
  const start = (bar.start / 100) * track;
  return start - gap - width >= 0
    ? { right: 100 - bar.start, side: 'before' }
    : { side: 'over' };
}

/** The "10 of 20 watched" label's width (12px text and a 12px icon) */
export const watchedWidth = (text: string, size: keyof typeof CHAR) =>
  text.length * CHAR[size] + (size === 'desktop' ? 17 : 15);

function decades(from: number, to: number, step: number) {
  const out: number[] = [];
  for (let year = Math.ceil(from / step) * step; year < to; year += step) {
    if (year > from) {
      out.push(year);
    }
  }
  return out;
}

export function buildCareer(
  career: PersonCareer,
  { deathdate, deathYear, preferIds, today }: Options,
): CareerView | null {
  const died = deathYear != null;
  const markerYear = died ? deathYear : today;
  // Work released after his death is the point of the chart: always kept
  const ranked = pickRows(career.rows, preferIds);
  const posthumous = died
    ? career.rows.filter(
        (row) =>
          row.startYear >= Math.floor(markerYear) &&
          !ranked.some((pick) => pick.id === row.id),
      )
    : [];
  const picked = [...ranked, ...posthumous].sort(
    (a, b) => a.startYear - b.startYear || b.episodeCount - a.episodeCount,
  );
  const upcoming = died ? [] : career.upcoming.slice(0, UPCOMING_ROWS);
  const tickYears = career.guest.ticks.map((tick) => tick.year);

  if (picked.length === 0 && upcoming.length === 0 && tickYears.length === 0) {
    return null;
  }

  /**
   * A row's stretches in years: runs of consecutive aired years (`years`,
   * else start to end), an ongoing show's last run to the marker, and none
   * running past the date of death.
   */
  const runsOf = (row: PersonCareerRow): ReadonlyArray<Bar> => {
    const years = row.years?.length
      ? [...row.years].sort((a, b) => a - b)
      : Array.from(
          { length: row.endYear - row.startYear + 1 },
          (_, index) => row.startYear + index,
        );
    const runs: { start: number; end: number }[] = [];
    for (const year of years) {
      const last = runs.at(-1);
      if (last && year === last.end) {
        last.end = year + 1;
      } else {
        runs.push({ end: year + 1, start: year });
      }
    }
    const final = runs.at(-1);
    if (final && row.ongoing) {
      final.end = Math.max(markerYear, final.end);
    }
    return runs.map((run) =>
      died && run.start < markerYear && run.end > markerYear
        ? { end: markerYear, start: run.start }
        : run,
    );
  };
  const barEnd = (row: PersonCareerRow) =>
    runsOf(row).at(-1)?.end ?? row.endYear + 1;
  const upcomingYear = (date?: string) =>
    date ? Number(date.slice(0, 4)) : null;
  const ends = [
    ...picked.map(barEnd),
    ...tickYears.map((year) => year + 1),
    ...upcoming.map((item) => (upcomingYear(item.date) ?? 0) + 1),
  ];
  const y0 = Math.floor(
    Math.min(...picked.map((row) => row.startYear), ...tickYears, markerYear),
  );
  const lastEnd = Math.max(
    Math.ceil(Math.max(...ends, 0)),
    Math.floor(markerYear) + 1,
  );
  const y1 = lastEnd + 1;
  const span = y1 - y0;
  const x = (year: number) => ((year - y0) / span) * 100;

  const markerLabel =
    died && deathdate ? `Died ${formatDay(deathdate)}` : 'Today';
  const marker = { at: x(markerYear), died, label: markerLabel };

  // Year labels never collide with the marker's label: Today is centred on
  // the line, the date of death ends 6px left of it.
  const axisFor = (size: keyof typeof TRACK, step: number) => {
    const px = (year: number) => (x(year) / 100) * TRACK[size];
    const labelWidth = markerLabel.length * CHAR[size];
    const [from, to] = died
      ? [px(markerYear) - 6 - labelWidth, px(markerYear)]
      : [px(markerYear) - labelWidth / 2, px(markerYear) + labelWidth / 2];
    return decades(y0, y1, 10)
      .filter((_, index) => index % (step / 10) === 0)
      .filter((year) => px(year) + 16 < from - 4 || px(year) - 16 > to + 4)
      .map((year) => ({ at: x(year), label: String(year) }));
  };

  const names = new Set(picked.map((row) => row.name));
  const rows = picked.map((row): CareerRowView => {
    const runs = runsOf(row).map((run) => ({
      end: x(run.end),
      start: x(run.start),
    }));
    const bar = { end: x(barEnd(row)), start: x(row.startYear) };
    const years = yearSpan(row.startYear, row.endYear);
    const episodes = plural(row.episodeCount, 'episode');
    const captionWidth =
      (row.role.length + episodes.length + years.length) * CHAR.desktop +
      3 * 17 +
      2 * 12 +
      16;
    return {
      bar,
      caption: besideBar(bar, captionWidth, TRACK.desktop),
      details: `: ${[row.role, episodes, years].filter(Boolean).join(', ')}`,
      episodes,
      href: showPath(row.id, row.slug),
      id: row.id,
      name: shortName(row.name, names),
      role: row.role,
      runs,
      voice: VOICE_ROLE.test(row.role),
      weight: row.weight,
      years,
    };
  });

  const upcomingRows = upcoming.map((item): CareerUpcomingView => {
    const year = upcomingYear(item.date);
    const start = year ?? y1 - 1;
    const dated = item.state === 'dated' && item.date;
    const when = dated
      ? `Premieres ${formatMonthDay(item.date ?? '')}`
      : 'In development';
    const date = dated && year ? String(year) : 'No date yet';
    return {
      bar: { end: x(start + 1), start: x(start) },
      captionRight: 100 - x(markerYear - 0.16),
      date,
      details: `: ${[item.role, when, date].filter(Boolean).join(', ')}`,
      href: showPath(item.id, item.slug),
      id: item.id,
      name: item.name,
      role: item.role,
      when,
    };
  });

  const guest = guestView(career.guest, x, span);

  return {
    axis: { desktop: axisFor('desktop', 10), phone: axisFor('phone', 20) },
    grid: decades(y0, y1, 10).map(x),
    guest,
    marker,
    rows,
    upcoming: upcomingRows,
  };
}

/** The guest caption's distance from the tick it follows */
export const GUEST_CAPTION_GAP = 4;

/**
 * The guest caption's width: "38 one-off roles" and "1977–2020", each
 * after a 12px icon and 5px, 12 apart, padded 8px a side
 */
const guestCaptionWidth = (count: number, years: string) =>
  (`${count} one-off roles`.length + years.length) * CHAR.desktop +
  2 * (12 + 5) +
  12 +
  16;

function guestView(
  guest: PersonCareer['guest'],
  x: (year: number) => number,
  span: number,
): CareerGuestView | null {
  if (guest.count === 0 || guest.ticks.length === 0) {
    return null;
  }
  // Several roles in one year spread across that year
  const perYear = new Map<number, number>();
  const ticks = guest.ticks.map(({ year }) => {
    const index = perYear.get(year) ?? 0;
    perYear.set(year, index + 1);
    const offset = Math.min(index * 0.3, 0.9);
    return x(year + offset) + 100 / span / 2;
  });
  const sorted = [...ticks].sort((a, b) => a - b);
  let captionAt = 0;
  let widest = -1;
  for (const [index, at] of sorted.entries()) {
    const next = sorted[index + 1] ?? 100;
    if (next - at > widest) {
      widest = next - at;
      captionAt = at;
    }
  }
  const first = guest.firstYear ?? guest.ticks[0]?.year ?? 0;
  const last = guest.lastYear ?? guest.ticks.at(-1)?.year ?? first;
  const years = yearSpan(first, last);
  const fits =
    (captionAt / 100) * TRACK.desktop +
      GUEST_CAPTION_GAP +
      guestCaptionWidth(guest.count, years) <=
    TRACK.desktop;
  return {
    aria: `${plural(guest.count, 'guest role')}, ${first} to ${last}. Show them in Series`,
    caption: fits
      ? { left: captionAt, side: 'after' }
      : { right: 0, side: 'before' },
    count: guest.count,
    ticks,
    years,
  };
}
