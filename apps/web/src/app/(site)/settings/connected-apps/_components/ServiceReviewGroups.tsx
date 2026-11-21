'use client';

import { AnimatePresence } from 'motion/react';
import { useState } from 'react';

import FoldPresence from '@/components/motion/FoldPresence';

import {
  AmbiguousProblems,
  NotFoundProblems,
} from '../../_components/problems/KindGroups';
import { rowsIn } from '../../_components/problems/problemRows';
import type {
  ProblemGroups,
  ProblemItem,
} from '../../_components/problems/problems';
import {
  type ReviewFixes,
  reviewHandlers,
} from '../_lib/serviceReviewHandlers';
import { useConnectedService } from './ServiceContext';
import SkipAllButton from './SkipAllButton';

/**
 * A group folds away with the list's 12px gap above it: it draws the gap
 * itself (`pt-3`) and takes the list's back (`-mt-3`).
 */
const GROUP_FOLD = '-mt-3';
const GROUP_GAP = 'pt-3';

/**
 * The review list's two groups, the importer's own: two series with the
 * entry's name (pick one), and not found (search for the show or pick the
 * episode). Skip closes the entry for good; each group's Skip all closes all
 * of its entries, the ones not loaded yet too: the group stays while its
 * items leave one after another, then folds away.
 */
export default function ServiceReviewGroups({
  arrives,
  fix,
  groups,
  onSkippedAll,
  skip,
}: Readonly<
  ReviewFixes & {
    /** An item Show more brought: it opens into its group */
    arrives: (item: ProblemItem) => boolean;
    groups: ProblemGroups;
    /** After a Skip all: how many it closed, and the group's loaded items */
    onSkippedAll: (closed: number, items: ReadonlyArray<ProblemItem>) => void;
  }
>) {
  const { id } = useConnectedService();
  const ambiguousId = `${id}-review-ambiguous`;
  const notFoundId = `${id}-review-not-found`;
  const [open, setOpen] = useState({ ambiguous: true, notFound: true });
  const [sweeping, setSweeping] = useState<'ambiguous' | 'notFound' | null>(
    null,
  );
  const swept = () => setSweeping(null);
  // A shut group has no items drawn to leave: it goes at once
  const skippedAmbiguous = (closed: number) => {
    setSweeping(open.ambiguous ? 'ambiguous' : null);
    onSkippedAll(closed, groups.ambiguous);
  };
  const skippedNotFound = (closed: number) => {
    setSweeping(open.notFound ? 'notFound' : null);
    onSkippedAll(closed, groups.notFound);
  };
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
        onSkipped={skippedAmbiguous}
      />
    ) : null;
  const skipNotFound =
    groups.notFound.length > 1 ? (
      <SkipAllButton
        group="not-found"
        groupName="Not found"
        onSkipped={skippedNotFound}
      />
    ) : null;

  const showAmbiguous = groups.ambiguous.length > 0 || sweeping === 'ambiguous';
  const showNotFound = groups.notFound.length > 0 || sweeping === 'notFound';
  return (
    <AnimatePresence initial={false}>
      {showAmbiguous ? (
        <FoldPresence className={GROUP_FOLD} key="ambiguous">
          <div className={GROUP_GAP}>
            <AmbiguousProblems
              action={skipAmbiguous}
              arrives={arrives}
              bodyId={ambiguousId}
              count={ambiguousCount}
              items={groups.ambiguous}
              onPick={pickCandidate}
              onSkip={skip}
              onSwept={swept}
              onToggle={toggleAmbiguous}
              open={open.ambiguous}
              sweeping={sweeping === 'ambiguous'}
              unit="entries"
            />
          </div>
        </FoldPresence>
      ) : null}
      {showNotFound ? (
        <FoldPresence className={GROUP_FOLD} key="not-found">
          <div className={GROUP_GAP}>
            <NotFoundProblems
              action={skipNotFound}
              arrives={arrives}
              bodyId={notFoundId}
              count={notFoundCount}
              handlers={notFound}
              items={groups.notFound}
              onSwept={swept}
              onToggle={toggleNotFound}
              open={open.notFound}
              sweeping={sweeping === 'notFound'}
              unit="entries"
            />
          </div>
        </FoldPresence>
      ) : null}
    </AnimatePresence>
  );
}
