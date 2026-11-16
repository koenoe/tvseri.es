'use client';

import { useCallback, useMemo, useState } from 'react';
import { plural } from '@/lib/format/text';
import { formatGrouped } from '@/lib/formatCount';

import { episodeCode } from '@/lib/marking/copy';
import type { SearchShow } from '@/lib/search/searchView';

import type {
  EpisodeOption,
  ImportRow,
  SeriesCandidate,
} from '../_lib/contract';
import type { Fix, ImportStep, PickedFix } from '../_lib/importState';
import { groupsOf } from '../_lib/importState';
import { type ProblemItem, rowCount } from '../_lib/problems';
import type { Importer } from '../_lib/useImporter';
import AmbiguousItem from './AmbiguousItem';
import NotFoundItem, { type NotFoundHandlers } from './NotFoundItem';
import ProblemGroup, { ProblemItemFrame } from './ProblemGroup';
import RestItem from './RestItem';
import { CARD_COUNT, CARD_HEAD, CARD_TITLE } from './styles';

/** Items shown one by one before the rest is summed up (2). */
const VISIBLE = 2;

const rowsIn = (items: ReadonlyArray<ProblemItem>) =>
  items.reduce((sum, item) => sum + item.indexes.length, 0);

const openRows = (
  items: ReadonlyArray<ProblemItem>,
  fixes: Readonly<Record<string, Fix>>,
) => rowsIn(items.filter((item) => !fixes[item.key]));

const picked = (label: string, rows: number): PickedFix => ({
  imported: rows,
  kind: 'picked',
  label,
  rows,
  status: 'waiting',
});

/**
 * "Not imported": per-record problems as they stream
 * in, in three collapsible groups. Two shows with this name (pick one: its
 * rows come in), Not found (search manually or skip), No episode in the
 * title (listed, skipped on purpose). Long groups show two items and sum up
 * the rest.
 */
export default function ProblemGroups({
  filmsTitle,
  importer,
  state,
}: Readonly<{
  /** "Beat Luke Littler, Glass Onion and 410 more" */
  filmsTitle: string;
  importer: Importer;
  state: ImportStep;
}>) {
  const { run, prepared } = state;
  const { fixes, open } = run;
  const groups = useMemo(() => groupsOf(run), [run]);
  const [expanded, setExpanded] = useState({
    ambiguous: false,
    notFound: false,
  });

  const rowsFor = (
    item: ProblemItem,
    extra: Partial<ImportRow>,
  ): ReadonlyArray<ImportRow> =>
    item.indexes.flatMap((index) => {
      const row = prepared.rows[index];
      return row ? [{ ...row, ...extra }] : [];
    });

  const pickSeries = (item: ProblemItem, seriesId: number, label: string) => {
    const rows = rowsFor(item, { seriesId });
    importer.pick({
      fix: picked(label, rows.length),
      key: item.key,
      rows,
      toast: `Imported ${plural(rows.length, 'episode')} of ${label}`,
    });
  };
  const onPickCandidate = (item: ProblemItem, candidate: SeriesCandidate) =>
    pickSeries(
      item,
      candidate.id,
      candidate.year ? `${item.query} (${candidate.year})` : candidate.title,
    );
  const skipItem = (item: ProblemItem) =>
    importer.skip({
      keys: [item.key],
      rows: item.indexes.length,
      toast: `Skipped ${item.kind === 'series-not-found' ? item.query : item.title}`,
    });

  const handlers: NotFoundHandlers = {
    onPickEpisode: (item: ProblemItem, episode: EpisodeOption) => {
      const series = item.series;
      if (!series) {
        return;
      }
      const label = `${series.title} ${episodeCode(episode)}`;
      const rows = rowsFor(item, {
        episodeNumber: episode.episodeNumber,
        seasonNumber: episode.seasonNumber,
        seriesId: series.id,
      });
      importer.pick({
        fix: picked(label, rows.length),
        key: item.key,
        rows,
        toast: `Imported ${label}`,
      });
    },
    onPickShow: (item: ProblemItem, show: SearchShow) =>
      pickSeries(
        item,
        show.id,
        show.releaseYear ? `${show.title} (${show.releaseYear})` : show.title,
      ),
    onRetry: (item: ProblemItem) => {
      const rows = rowsFor(item, {});
      importer.pick({
        fix: picked(item.title, rows.length),
        key: item.key,
        rows,
        toast: `Imported ${item.title}`,
      });
    },
    onSkip: skipItem,
    onUndo: importer.clearFix,
  };

  const ambiguousRows = openRows(groups.ambiguous, fixes);
  const notFoundRows = openRows(groups.notFound, fixes);
  const films = prepared.skipped.films;
  const total = ambiguousRows + notFoundRows;
  if (
    groups.ambiguous.length === 0 &&
    groups.notFound.length === 0 &&
    films === 0
  ) {
    return null;
  }

  const split = (items: ReadonlyArray<ProblemItem>, all: boolean) =>
    all || items.length <= VISIBLE + 1
      ? { rest: [], shown: items }
      : { rest: items.slice(VISIBLE), shown: items.slice(0, VISIBLE) };
  const ambiguous = split(groups.ambiguous, expanded.ambiguous);
  const notFound = split(groups.notFound, expanded.notFound);
  const toggleAmbiguous = () => importer.toggleGroup('ambiguous');
  const toggleNotFound = () => importer.toggleGroup('notFound');
  const toggleNoEpisode = () => importer.toggleGroup('noEpisode');
  const showAmbiguous = () =>
    setExpanded((was) => ({ ...was, ambiguous: true }));
  const showNotFound = () => setExpanded((was) => ({ ...was, notFound: true }));
  const totalLine = `${plural(total, 'row')} · fix them here, or skip`;
  const ambiguousRest = rowsIn(ambiguous.rest);
  const notFoundRest = rowsIn(notFound.rest);
  const notFoundLike = notFound.rest
    .slice(0, 2)
    .map((item) => item.query)
    .join(' and ');

  return (
    <div className="flex flex-col gap-3">
      <div className={`${CARD_HEAD} mb-1`}>
        <span className="size-2 shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_white]" />
        <h3 className={CARD_TITLE}>Not imported</h3>
        <span className={CARD_COUNT}>{totalLine}</span>
      </div>
      {groups.ambiguous.length > 0 ? (
        <ProblemGroup
          count={ambiguousRows}
          id="ambiguous"
          name="Two series with this name"
          onToggle={toggleAmbiguous}
          open={open.ambiguous}
          what="Pick the right one and its rows come in"
        >
          {ambiguous.shown.map((item) => (
            <AmbiguousItem
              fix={fixes[item.key]}
              item={item}
              key={item.key}
              onPick={onPickCandidate}
              onSkip={skipItem}
              onUndo={importer.clearFix}
            />
          ))}
          {ambiguous.rest.length > 0 ? (
            <Rest
              fixes={fixes}
              importer={importer}
              items={ambiguous.rest}
              onShow={showAmbiguous}
              skipLabel="Skip them"
              title={`${formatGrouped(ambiguousRest)} more rows across ${plural(ambiguous.rest.length, 'series', 'series')}`}
              toast={`Skipped ${plural(ambiguousRest, 'row')}`}
              why="More series that share a name"
            />
          ) : null}
        </ProblemGroup>
      ) : null}
      {groups.notFound.length > 0 ? (
        <ProblemGroup
          count={notFoundRows}
          id="not-found"
          name="Not found"
          onToggle={toggleNotFound}
          open={open.notFound}
          what="No series or episode by that name on TMDB"
        >
          {notFound.shown.map((item) => (
            <NotFoundItem
              fix={fixes[item.key]}
              handlers={handlers}
              item={item}
              key={item.key}
            />
          ))}
          {notFound.rest.length > 0 ? (
            <Rest
              fixes={fixes}
              importer={importer}
              items={notFound.rest}
              onShow={showNotFound}
              skipLabel={`Skip all ${formatGrouped(notFoundRest)}`}
              title={`${formatGrouped(notFoundRest)} more like these`}
              toast={`Skipped ${formatGrouped(notFoundRest)} recaps and extras`}
              why={`Recaps, extras and titles TMDB doesn’t know, like ${notFoundLike}`}
            />
          ) : null}
        </ProblemGroup>
      ) : null}
      {films > 0 ? (
        <ProblemGroup
          count={films}
          id="no-episode"
          name="No episode in the title"
          onToggle={toggleNoEpisode}
          open={open.noEpisode}
          what="Films and specials: tvseri.es tracks series"
        >
          <ProblemItemFrame
            count={rowCount(films)}
            title={filmsTitle}
            why="No episode in the title: films and specials, skipped on purpose"
          />
        </ProblemGroup>
      ) : null}
    </div>
  );
}

/** The summed-up rest of a group, skipped (or brought back) all at once. */
function Rest({
  fixes,
  importer,
  items,
  onShow,
  skipLabel,
  title,
  toast,
  why,
}: Readonly<{
  fixes: Readonly<Record<string, Fix>>;
  importer: Importer;
  items: ReadonlyArray<ProblemItem>;
  onShow: () => void;
  skipLabel: string;
  title: string;
  toast: string;
  why: string;
}>) {
  const keys = items.map((item) => item.key);
  const rows = rowsIn(items);
  const allSkipped = keys.every((key) => fixes[key]?.kind === 'skipped');
  const { clearFix, skip: skipKeys } = importer;
  const skip = useCallback(
    () => skipKeys({ keys: keys.filter((key) => !fixes[key]), rows, toast }),
    [skipKeys, keys, fixes, rows, toast],
  );
  const undo = useCallback(() => {
    for (const key of keys) {
      clearFix(key);
    }
  }, [clearFix, keys]);
  return (
    <RestItem
      count={rowCount(rows)}
      onShow={onShow}
      onSkip={skip}
      onUndo={undo}
      skipLabel={skipLabel}
      skipped={allSkipped ? rows : 0}
      title={title}
      why={why}
    />
  );
}
