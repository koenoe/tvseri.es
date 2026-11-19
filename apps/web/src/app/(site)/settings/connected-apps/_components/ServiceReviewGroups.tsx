'use client';

import { useState } from 'react';

import {
  AmbiguousProblems,
  NotFoundProblems,
} from '../../_components/problems/KindGroups';
import { rowsIn } from '../../_components/problems/problemRows';
import type { ProblemGroups } from '../../_components/problems/problems';
import {
  type ReviewFixes,
  reviewHandlers,
} from '../_lib/serviceReviewHandlers';
import { useConnectedService } from './ServiceContext';
import SkipAllButton from './SkipAllButton';

/**
 * The review list's two groups, the importer's own: two series with the
 * entry's name (pick one), and not found (search for the show or pick the
 * episode). Skip closes the entry for good; each group's Skip all closes all
 * of its entries, the ones not loaded yet too.
 */
export default function ServiceReviewGroups({
  fix,
  groups,
  onSkippedAll,
  skip,
}: Readonly<
  ReviewFixes & {
    groups: ProblemGroups;
    onSkippedAll: (closed: number) => void;
  }
>) {
  const { id } = useConnectedService();
  const ambiguousId = `${id}-review-ambiguous`;
  const notFoundId = `${id}-review-not-found`;
  const [open, setOpen] = useState({ ambiguous: true, notFound: true });
  const toggleAmbiguous = () =>
    setOpen((was) => ({ ...was, ambiguous: !was.ambiguous }));
  const toggleNotFound = () =>
    setOpen((was) => ({ ...was, notFound: !was.notFound }));
  const { notFound, pickCandidate } = reviewHandlers({ fix, skip });
  const ambiguousCount = rowsIn(groups.ambiguous);
  const notFoundCount = rowsIn(groups.notFound);
  // A group of one has its own Skip
  const skipAmbiguous =
    groups.ambiguous.length > 1 ? (
      <SkipAllButton
        group="ambiguous"
        groupName="Which series?"
        onSkipped={onSkippedAll}
      />
    ) : null;
  const skipNotFound =
    groups.notFound.length > 1 ? (
      <SkipAllButton
        group="not-found"
        groupName="Not found"
        onSkipped={onSkippedAll}
      />
    ) : null;

  return (
    <>
      {groups.ambiguous.length > 0 ? (
        <AmbiguousProblems
          action={skipAmbiguous}
          bodyId={ambiguousId}
          count={ambiguousCount}
          items={groups.ambiguous}
          onPick={pickCandidate}
          onSkip={skip}
          onToggle={toggleAmbiguous}
          open={open.ambiguous}
          unit="entries"
        />
      ) : null}
      {groups.notFound.length > 0 ? (
        <NotFoundProblems
          action={skipNotFound}
          bodyId={notFoundId}
          count={notFoundCount}
          handlers={notFound}
          items={groups.notFound}
          onToggle={toggleNotFound}
          open={open.notFound}
          unit="entries"
        />
      ) : null}
    </>
  );
}
