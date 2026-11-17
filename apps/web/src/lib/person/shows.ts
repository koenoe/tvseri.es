import type {
  Person,
  PersonCareerRow,
  PersonShow,
  PersonShows,
} from '@tvseri.es/schemas';
import { upperFirst } from '@tvseri.es/utils';
import { plural, sentenceCase } from '@/lib/format/text';
import showPath from '@/lib/routing/showPath';

import { formatMonthDay, yearSpan } from './format';

/**
 * The Shows list: text rows, cast and crew merged,
 * filtered by the pills (All, Series, Guest roles, Behind the camera), an
 * Upcoming group first and "As himself" folded at the end. Only what a row
 * draws crosses to the client.
 */

export const SHOW_FILTERS = ['all', 'series', 'guest', 'crew'] as const;
export type ShowFilter = (typeof SHOW_FILTERS)[number];

export const FILTER_LABELS: Readonly<Record<ShowFilter, string>> = {
  all: 'All',
  crew: 'Behind the camera',
  guest: 'Guest roles',
  series: 'Series',
};

export type ShowRowView = Readonly<{
  id: number;
  href: string;
  name: string;
  /** "2008–2013", "2022", "No date yet" */
  years: string;
  /** Characters; "Role not listed" when TMDB has none */
  role: string;
  voice: boolean;
  /** "Director, executive producer" */
  crew: string;
  /** Only crew credits: the line is the crew work, no episodes */
  crewOnly: boolean;
  /** "62 episodes"; null for crew-only rows */
  episodes: string | null;
  /** Bitmask-free filter flags */
  series: boolean;
  guest: boolean;
  behind: boolean;
  /** Upcoming: "In development" or "Premieres Jun 12" */
  when?: string;
}>;

export type ShowsView = Readonly<{
  total: number;
  counts: Readonly<Record<ShowFilter, number>>;
  upcoming: ReadonlyArray<ShowRowView>;
  shows: ReadonlyArray<ShowRowView>;
  self: ReadonlyArray<ShowRowView>;
  /** "As himself", "As herself", "As themselves" */
  selfLabel: string;
}>;

/** A voice or narration credit: the mic instead of the person */
export const VOICE_ROLE = /\bvoice\b|narrator/i;

/** "Director, executive producer": one sentence */
const crewLine = (jobs: ReadonlyArray<string>) => sentenceCase(jobs.join(', '));

const VERBS: ReadonlyArray<readonly [RegExp, string, boolean]> = [
  // [job, verb, counts episodes]
  [/^creator$/i, 'created', false],
  [/^director$/i, 'directed', true],
  [/writer|screenplay|teleplay|story|novel/i, 'wrote', true],
];

/**
 * His work behind the camera: "Created, wrote 2
 * episodes", "Directed 7 episodes". Producing is left out next to that
 * work; a producer only ("Executive producer") keeps the job titles.
 */
export function crewWork(
  crewJobs: PersonShow['crewJobs'],
  jobs: ReadonlyArray<string>,
): string {
  const done = new Map<string, number>();
  for (const { episodeCount, job } of crewJobs ?? []) {
    const verb = VERBS.find(([pattern]) => pattern.test(job));
    if (verb) {
      done.set(verb[1], Math.max(done.get(verb[1]) ?? 0, episodeCount));
    }
  }
  if (done.size === 0) {
    return crewLine(jobs);
  }
  const phrases = VERBS.filter(([, verb]) => done.has(verb)).map(
    ([, verb, counted]) => {
      const count = done.get(verb) ?? 0;
      return counted && count > 0
        ? `${verb} ${plural(count, 'episode')}`
        : verb;
    },
  );
  return upperFirst(phrases.join(', '));
}

export const inFilter = (row: ShowRowView, filter: ShowFilter) =>
  filter === 'all'
    ? true
    : filter === 'series'
      ? row.series
      : filter === 'guest'
        ? row.guest
        : row.behind;

function toRow(
  show: PersonShow,
  spans: ReadonlyMap<number, PersonCareerRow>,
): ShowRowView {
  const span = spans.get(show.id);
  const years = show.upcoming
    ? show.upcoming.state === 'dated' && show.year
      ? String(show.year)
      : 'No date yet'
    : span
      ? yearSpan(span.startYear, span.endYear)
      : show.year
        ? String(show.year)
        : '';
  const crewOnly = !show.isCast && show.isCrew;
  return {
    behind: show.isCrew,
    crew: crewWork(show.crewJobs, show.jobs),
    crewOnly,
    episodes:
      crewOnly || show.episodeCount === 0
        ? null
        : plural(show.episodeCount, 'episode'),
    guest: show.isGuest,
    href: showPath(show.id, show.slug),
    id: show.id,
    name: show.name,
    role: show.isCast
      ? show.characters.join(' / ') || 'Role not listed'
      : show.role,
    series: show.isCast && !show.isGuest,
    voice: show.isVoice || VOICE_ROLE.test(show.role),
    years,
    ...(show.upcoming && {
      when:
        show.upcoming.state === 'dated' && show.upcoming.date
          ? `Premieres ${formatMonthDay(show.upcoming.date)}`
          : 'In development',
    }),
  };
}

const SELF: Readonly<Record<NonNullable<Person['gender']>, string>> = {
  female: 'As herself',
  male: 'As himself',
  'non-binary': 'As themselves',
};

export function buildShows(
  shows: PersonShows,
  careerRows: ReadonlyArray<PersonCareerRow>,
  gender?: Person['gender'],
): ShowsView {
  const spans = new Map(careerRows.map((row) => [row.id, row]));
  const upcoming = shows.upcoming.map((show) => toRow(show, spans));
  // Newest last year first (sorts by the end of each span), then
  // the newer show; undated last
  const lastYear = (show: PersonShow) =>
    spans.get(show.id)?.endYear ?? show.year ?? Number.NEGATIVE_INFINITY;
  const ordered = [...shows.shows].sort(
    (a, b) =>
      lastYear(b) - lastYear(a) ||
      (b.firstAirDate ?? '').localeCompare(a.firstAirDate ?? ''),
  );
  const rows = ordered.map((show) => toRow(show, spans));
  // One source for every number: the past shows (announced work is its own
  // group: a 67 never counts an announced show)
  const count = (filter: ShowFilter) =>
    rows.filter((row) => inFilter(row, filter)).length;
  return {
    counts: {
      all: rows.length,
      crew: count('crew'),
      guest: count('guest'),
      series: count('series'),
    },
    self: shows.self.map((show) => toRow(show, spans)),
    selfLabel: gender ? SELF[gender] : 'As themselves',
    shows: rows,
    total: rows.length,
    upcoming,
  };
}
