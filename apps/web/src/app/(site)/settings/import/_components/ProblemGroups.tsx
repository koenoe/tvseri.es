'use client';

import { plural } from '@tvseri.es/utils';
import { useMemo, useState } from 'react';
import ProblemGroup, {
  ProblemItemFrame,
} from '../../_components/problems/ProblemGroup';
import { openRows } from '../../_components/problems/problemRows';
import { rowCount } from '../../_components/problems/problems';
import type { ImportStep } from '../_lib/importState';
import { groupsOf } from '../_lib/importState';
import type { Importer } from '../_lib/useImporter';
import { useProblemFixes } from '../_lib/useProblemFixes';
import AmbiguousGroup from './AmbiguousGroup';
import NotFoundGroup from './NotFoundGroup';
import { CARD_COUNT, CARD_HEAD, CARD_TITLE } from './styles';

const HEAD = `${CARD_HEAD} mb-1`;

/**
 * "Not imported": per-record problems as they stream
 * in, in three collapsible groups. Which series? (pick one: its
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
  const { handlers, onPickCandidate, skipItem } = useProblemFixes(
    importer,
    state,
  );

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

  const toggleNoEpisode = () => importer.toggleGroup('noEpisode');
  const showAmbiguous = () =>
    setExpanded((was) => ({ ...was, ambiguous: true }));
  const showNotFound = () => setExpanded((was) => ({ ...was, notFound: true }));
  const totalLine = `${plural(total, 'row')} · fix them here, or skip`;
  const filmRows = rowCount(films);

  return (
    <div className="flex flex-col gap-3">
      <div className={HEAD}>
        <span className="size-2 shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_white]" />
        <h3 className={CARD_TITLE}>Not imported</h3>
        <span className={CARD_COUNT}>{totalLine}</span>
      </div>
      {groups.ambiguous.length > 0 ? (
        <AmbiguousGroup
          count={ambiguousRows}
          expanded={expanded.ambiguous}
          fixes={fixes}
          importer={importer}
          items={groups.ambiguous}
          onPick={onPickCandidate}
          onShowAll={showAmbiguous}
          onSkip={skipItem}
          open={open.ambiguous}
        />
      ) : null}
      {groups.notFound.length > 0 ? (
        <NotFoundGroup
          count={notFoundRows}
          expanded={expanded.notFound}
          fixes={fixes}
          handlers={handlers}
          importer={importer}
          items={groups.notFound}
          onShowAll={showNotFound}
          open={open.notFound}
        />
      ) : null}
      {films > 0 ? (
        <ProblemGroup
          bodyId="import-group-no-episode"
          count={films}
          name="No episode in the title"
          onToggle={toggleNoEpisode}
          open={open.noEpisode}
          what="Films and specials: tvseri.es tracks series"
        >
          <ProblemItemFrame
            count={filmRows}
            title={filmsTitle}
            why="No episode in the title: films and specials, skipped on purpose"
          />
        </ProblemGroup>
      ) : null}
    </div>
  );
}
