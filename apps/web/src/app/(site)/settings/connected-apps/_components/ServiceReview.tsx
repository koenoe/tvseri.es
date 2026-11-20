'use client';

import type { ConnectionUnresolvedPage } from '@tvseri.es/schemas';
import { formatGrouped, plural } from '@tvseri.es/utils';
import { useId, useMemo, useRef } from 'react';

import Button from '@/components/ui/button/Button';

import {
  type ProblemItem,
  problemGroups,
} from '../../_components/problems/problems';
import { SMALL_BUTTON } from '../../_components/problems/styles';
import { focusTargetAfter, reviewProblems } from '../_lib/serviceReview';
import { appToggleId } from './AppsAccordion';
import { OPTION_LINE_CLASS, OPTION_TITLE_CLASS } from './layout';
import { usePublishReviewCount } from './reviewCount';
import { useConnectedService } from './ServiceContext';
import ServiceReviewGroups from './ServiceReviewGroups';
import useServiceReview from './useServiceReview';

/** "40 more weren’t kept: the list was full" */
const overflowLine = (overflow: number) =>
  `${formatGrouped(overflow)} more ${overflow === 1 ? 'wasn’t' : 'weren’t'} kept: the list was full`;

/** The first control of the item with `key` in `section`, if it is drawn */
const controlOf = (section: HTMLElement, key: string) =>
  Array.from(section.querySelectorAll<HTMLElement>('[data-problem-key]'))
    .find((frame) => frame.dataset.problemKey === key)
    ?.querySelector<HTMLElement>('button') ?? null;

/**
 * Entries the sync couldn't match: pick the right series or episode, or
 * skip. `count` is the server's total, including entries not loaded yet.
 * When an item leaves, focus moves to the next one, else the heading, else
 * the card's toggle; after a Skip all, to the heading or the toggle.
 */
export default function ServiceReview({
  count,
  overflow,
  page,
}: Readonly<{
  count: number;
  overflow: number;
  page: ConnectionUnresolvedPage;
}>) {
  const service = useConnectedService();
  const headingId = useId();
  const section = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const review = useServiceReview(page, count);
  const { closed, entries, remaining } = review;
  const groups = useMemo(
    () => problemGroups(reviewProblems(entries, closed)),
    [closed, entries],
  );
  // The sync row above says "N to review" from this, as it changes
  usePublishReviewCount(service.id, remaining + overflow);
  if (remaining === 0 && overflow === 0) {
    return null;
  }

  // Before the item leaves, while its neighbours are still drawn
  const leave = (item: ProblemItem) => {
    const order = [...groups.ambiguous, ...groups.notFound].map(
      ({ key }) => key,
    );
    const target = focusTargetAfter(order, item.key);
    const next =
      target && section.current ? controlOf(section.current, target) : null;
    if (next) {
      next.focus();
    } else {
      leaveAfter(item.indexes.length);
    }
  };
  // The heading while anything stays, else the card's toggle
  const leaveAfter = (closed: number) => {
    if (remaining > closed || overflow > 0) {
      heading.current?.focus();
    } else {
      document.getElementById(appToggleId(service.id))?.focus();
    }
  };
  const fix: typeof review.fix = (item, pick, label) => {
    leave(item);
    review.fix(item, pick, label);
  };
  const skip = (item: ProblemItem) => {
    leave(item);
    review.skip(item);
  };
  const skippedAll = (
    closedCount: number,
    items: ReadonlyArray<ProblemItem>,
  ) => {
    leaveAfter(closedCount);
    review.sweep(items);
  };

  const line =
    remaining > 0
      ? `${plural(remaining, 'entry', 'entries')} the sync couldn’t match · fix them here, or skip`
      : null;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
      ref={section}
    >
      <div className="flex flex-col gap-1">
        <h3
          className={OPTION_TITLE_CLASS}
          id={headingId}
          ref={heading}
          tabIndex={-1}
        >
          To review
        </h3>
        {line ? <p className={OPTION_LINE_CLASS}>{line}</p> : null}
        {overflow > 0 ? (
          <p className={OPTION_LINE_CLASS}>{overflowLine(overflow)}</p>
        ) : null}
      </div>
      <ServiceReviewGroups
        arrives={review.arrives}
        fix={fix}
        groups={groups}
        onSkippedAll={skippedAll}
        skip={skip}
      />
      {remaining > 0 && review.hasMore ? (
        <div>
          <Button
            className={SMALL_BUTTON}
            onClick={review.more}
            pending={review.loading}
            size="xs"
            variant="tonal"
          >
            <span className="text-body-sm">Show more</span>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
