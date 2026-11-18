import { episodeCode } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';

import type {
  EpisodeOption,
  ImportProblem,
  ImportProblemKind,
  SeriesCandidate,
} from '@/lib/import/contract';

/**
 * Per-record problems, grouped the way the page shows them: the Check
 * step's "Show" list (one line per group) and the import's collapsible
 * groups (one item per show or row, each fixable or skippable).
 */

const normalise = (title: string) => title.trim().toLowerCase();

const DIGITS = /^\d+$/;

/**
 * The row as the user knows it: "Wednesday: Season 2: Part 1 Recap" for a
 * Netflix title, "Severance · S02E10" for numeric columns.
 */
export const rowLabel = (
  row: Readonly<{ title: string; season: string; episode: string }>,
): string => {
  if (DIGITS.test(row.season) && DIGITS.test(row.episode)) {
    return `${row.title} · ${episodeCode({
      episodeNumber: Number(row.episode),
      seasonNumber: Number(row.season),
    })}`;
  }
  return [row.title, row.season, row.episode].filter(Boolean).join(': ');
};

const rows = (count: number) => plural(count, 'row');

const yearsOf = (candidates: ReadonlyArray<SeriesCandidate> = []) =>
  candidates
    .map((candidate) => candidate.year)
    .filter((year): year is string => Boolean(year))
    .slice()
    .sort();

const NUMBER_WORDS = ['', '', 'Two', 'Three', 'Four'];

const shareLine = (candidates: ReadonlyArray<SeriesCandidate> = []) => {
  const count = Math.max(2, candidates.length);
  const word = NUMBER_WORDS[count] ?? String(count);
  return `${word} series have this name`;
};

const joinYears = (years: ReadonlyArray<string>) =>
  years.length < 2
    ? years.join('')
    : `${years.slice(0, -1).join(', ')} and ${years.at(-1)}`;

export type UnmatchedLine = Readonly<{
  key: string;
  title: string;
  /** "18 rows" */
  count: string;
  why: string;
}>;

const andMore = (titles: ReadonlyArray<string>) =>
  titles.length > 1
    ? `${titles[0]}, and ${titles.length - 1} more`
    : (titles[0] ?? '');

/**
 * The Check step's list behind "Show": one line per
 * show with several series of its name (most rows first), then one line for
 * series TMDB doesn't know and one for episodes it doesn't know.
 */
export function unmatchedLines(
  problems: ReadonlyArray<ImportProblem>,
): ReadonlyArray<UnmatchedLine> {
  const ambiguous = new Map<
    string,
    {
      title: string;
      count: number;
      candidates?: ReadonlyArray<SeriesCandidate>;
    }
  >();
  const series: string[] = [];
  const seriesSeen = new Set<string>();
  let seriesRows = 0;
  const episodes: string[] = [];
  let episodeRows = 0;

  for (const problem of problems) {
    if (problem.kind === 'ambiguous') {
      const key = normalise(problem.row.title);
      const group = ambiguous.get(key);
      if (group) {
        group.count++;
      } else {
        ambiguous.set(key, {
          candidates: problem.candidates,
          count: 1,
          title: problem.row.title,
        });
      }
    } else if (problem.kind === 'series-not-found') {
      seriesRows++;
      const key = normalise(problem.row.title);
      if (!seriesSeen.has(key)) {
        seriesSeen.add(key);
        series.push(rowLabel(problem.row));
      }
    } else if (problem.kind === 'episode-not-found') {
      episodeRows++;
      episodes.push(rowLabel(problem.row));
    }
  }

  const lines: UnmatchedLine[] = [...ambiguous.entries()]
    .slice()
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([key, group]) => {
      const years = yearsOf(group.candidates);
      return {
        count: rows(group.count),
        key: `amb:${key}`,
        title: group.title,
        why:
          years.length > 1
            ? `${shareLine(group.candidates)} (${joinYears(years)}).`
            : `${shareLine(group.candidates)}.`,
      };
    });
  if (seriesRows > 0) {
    lines.push({
      count: rows(seriesRows),
      key: 'series',
      title: andMore(series),
      why: 'Look like films, not series.',
    });
  }
  if (episodeRows > 0) {
    lines.push({
      count: rows(episodeRows),
      key: 'episodes',
      title: andMore(episodes),
      why: 'Recaps and extras that aren’t episodes.',
    });
  }
  return lines;
}

/** One fixable thing in the import's groups: a show, or a single row. */
export type ProblemItem = Readonly<{
  key: string;
  kind: ImportProblemKind;
  /** "Top Boy", "Wednesday: Season 2: Part 1 Recap" */
  title: string;
  /** The show's name as written, for the search box */
  query: string;
  /** `ImportRow.index` of every row it covers */
  indexes: ReadonlyArray<number>;
  /** "Two series have this name.", "Could not find series “Trust No One”" */
  why: string;
  candidates: ReadonlyArray<SeriesCandidate>;
  series: SeriesCandidate | null;
  episodes: ReadonlyArray<EpisodeOption>;
  /** The season label as written ("Season 2"), for "which episode was it?" */
  season: string;
}>;

export type ProblemGroups = Readonly<{
  ambiguous: ReadonlyArray<ProblemItem>;
  notFound: ReadonlyArray<ProblemItem>;
}>;

/**
 * Items for the import's groups: "Two shows with this name" by show (most
 * rows first), "Not found" by show for unknown series and by row for unknown
 * episodes and failed writes (in arrival order). `round` keeps the keys of
 * follow-up problems (from a fix) apart from the first ones.
 */
export function problemGroups(
  problems: ReadonlyArray<ImportProblem>,
  round = 0,
): ProblemGroups {
  const suffix = round > 0 ? `#${round}` : '';
  const ambiguous = new Map<string, { item: ProblemItem; indexes: number[] }>();
  const series = new Map<string, { item: ProblemItem; indexes: number[] }>();
  const notFound: Array<{ item: ProblemItem; indexes: number[] }> = [];

  for (const problem of problems) {
    const title = problem.row.title;
    const base = {
      candidates: problem.candidates ?? [],
      episodes: problem.episodes ?? [],
      kind: problem.kind,
      query: title,
      season: problem.row.season,
      series: problem.series ?? null,
    };
    if (problem.kind === 'ambiguous' || problem.kind === 'series-not-found') {
      const groups = problem.kind === 'ambiguous' ? ambiguous : series;
      const key = `${problem.kind === 'ambiguous' ? 'amb' : 'sn'}:${normalise(title)}${suffix}`;
      const group = groups.get(key);
      if (group) {
        group.indexes.push(problem.index);
        continue;
      }
      const entry = {
        indexes: [problem.index],
        item: {
          ...base,
          indexes: [],
          key,
          title: problem.kind === 'ambiguous' ? title : rowLabel(problem.row),
          why:
            problem.kind === 'ambiguous'
              ? `${shareLine(problem.candidates)}.`
              : `Could not find series “${title}”`,
        },
      };
      groups.set(key, entry);
      if (problem.kind === 'series-not-found') {
        notFound.push(entry);
      }
      continue;
    }
    notFound.push({
      indexes: [problem.index],
      item: {
        ...base,
        indexes: [],
        key: `${problem.kind === 'failed' ? 'fail' : 'en'}:${problem.index}${suffix}`,
        title: rowLabel(problem.row),
        why:
          problem.kind === 'failed'
            ? 'Couldn’t save this one'
            : `Could not find episode “${problem.row.episode}”`,
      },
    });
  }

  const finish = ({
    item,
    indexes,
  }: {
    item: ProblemItem;
    indexes: number[];
  }) => ({
    ...item,
    indexes,
    title:
      item.kind === 'series-not-found' && indexes.length > 1
        ? item.query
        : item.title,
  });

  return {
    ambiguous: [...ambiguous.values()]
      .slice()
      .sort((a, b) => b.indexes.length - a.indexes.length)
      .map(finish),
    notFound: notFound.map(finish),
  };
}

/** "18 rows", "1 row" */
export const rowCount = rows;
