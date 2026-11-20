'use client';

import type {
  ConnectionUnresolved,
  ConnectionUnresolvedPage,
} from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';
import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { showToast } from '@/components/ui/toast/showToast';
import type { ActionError } from '@/lib/actions/result';

import type { ProblemItem } from '../../_components/problems/problems';
import { appErrorText } from '../_lib/appState';
import {
  entriesOf,
  type ReviewPick,
  toReviewEntry,
  withNewEntries,
} from '../_lib/serviceReview';
import {
  dismissEntries,
  moreUnresolved,
  resolveEntries,
} from '../reviewActions';
import { useConnectedService } from './ServiceContext';

const addKeys = (
  closed: ReadonlySet<string>,
  keys: ReadonlyArray<string>,
): ReadonlySet<string> => new Set([...closed, ...keys]);

/** Entries the matcher asked again replace theirs in place (same index) */
const replaced = (
  entries: ReadonlyArray<ConnectionUnresolved>,
  open: ReadonlyArray<ConnectionUnresolved>,
) => {
  const byKey = new Map(open.map((entry) => [entry.key, entry]));
  return entries.map((entry) => byKey.get(entry.key) ?? entry);
};

/**
 * The review list's state. Entries are only appended to, so a review item's
 * indexes stay put. A fix or Skip closes its keys optimistically; a failure
 * brings back only what it didn't close. Each server page adds its new
 * entries, so what a sync adds while the card is open shows up.
 */
export default function useServiceReview(
  page: ConnectionUnresolvedPage,
  count: number,
) {
  const { id, name } = useConnectedService();
  const failed = (error: ActionError) =>
    showToast({ title: appErrorText(name)[error], tone: 'error' });
  const [entries, setEntries] = useState<ReadonlyArray<ConnectionUnresolved>>(
    page.items,
  );
  const [cursor, setCursor] = useState(page.nextCursor);
  const [seed, setSeed] = useState(page);
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const [shown, closeNow] = useOptimistic(closed, addKeys);
  // A Skip all's loaded entries: off the list, but already out of the
  // server's count when it arrives, so never counted against it
  const [swept, setSwept] = useState<ReadonlySet<string>>(new Set());
  const hidden = useMemo(
    () => (swept.size === 0 ? shown : addKeys(shown, [...swept])),
    [shown, swept],
  );
  const [loading, startLoading] = useTransition();
  const [, startFix] = useTransition();

  // How many closes the server's `count` already takes in: all of them as it
  // stood when this count arrived (adjusted while rendering, no effect)
  const [counted, setCounted] = useState({ closed: 0, count });
  if (counted.count !== count) {
    setCounted({ closed: closed.size, count });
  }

  // A new server page, adjusted while rendering (no effect): its new entries
  // join the list, and its cursor is taken while nothing past it was loaded
  if (seed !== page) {
    setSeed(page);
    setEntries((was) => withNewEntries(was, page.items));
    if (cursor === seed.nextCursor) {
      setCursor(page.nextCursor);
    }
  }

  const more = () => {
    startLoading(async () => {
      const result = await moreUnresolved(id, cursor);
      if (!result.ok) {
        failed(result.error);
        return;
      }
      setEntries((was) => withNewEntries(was, result.data.items));
      setCursor(result.data.nextCursor);
    });
  };

  /**
   * After a fix or Skip, with every loaded entry closed: the next ones come
   * in by themselves rather than leaving an empty list with Show more.
   * Asked once the server has closed them, so the next page can't bring
   * back the entries just closed.
   */
  const moreIfEmptied = (closing: ReadonlySet<string>) => {
    const emptied = entries.every(
      ({ key }) => closing.has(key) || shown.has(key),
    );
    if (emptied && (cursor !== null || count - closing.size > 0)) {
      more();
    }
  };

  const fix = (item: ProblemItem, pick: ReviewPick, label: string) => {
    const picked = entriesOf(item, entries);
    startFix(async () => {
      closeNow(picked.map(({ key }) => key));
      const result = await resolveEntries(id, {
        entries: picked.map(toReviewEntry),
        pick,
      });
      if (!result.ok) {
        failed(result.error);
        return;
      }
      const { open, written } = result.data;
      setClosed((was) => addKeys(was, result.data.closed));
      setEntries((was) => replaced(was, open));
      moreIfEmptied(new Set(result.data.closed));
      if (result.data.failed) {
        failed(result.data.failed);
        return;
      }
      showToast({
        title:
          result.data.closed.length > 0
            ? `Marked ${plural(written, 'episode')} of ${label}`
            : `No episode of ${label} fits. Pick one from the list.`,
      });
    });
  };

  const skip = (item: ProblemItem) => {
    const keys = entriesOf(item, entries).map(({ key }) => key);
    startFix(async () => {
      closeNow(keys);
      const result = await dismissEntries(id, { keys });
      if (!result.ok) {
        failed(result.error);
        return;
      }
      setClosed((was) => addKeys(was, result.data.closed));
      moreIfEmptied(new Set(result.data.closed));
      if (result.data.failed) {
        failed(result.data.failed);
        return;
      }
      showToast({ title: `Skipped ${item.title}` });
    });
  };

  // Closed here but not yet in the server's total; without it the list
  // looked one short for a moment and showed Show more
  const uncounted = shown.size - counted.closed;
  const remaining = Math.max(0, count - uncounted);
  const loadedOpen = entries.filter(({ key }) => !hidden.has(key)).length;

  /** After a Skip all: its group's loaded items leave the list */
  const sweep = (items: ReadonlyArray<ProblemItem>) => {
    const keys = items.flatMap((item) =>
      entriesOf(item, entries).map(({ key }) => key),
    );
    setSwept((was) => addKeys(was, keys));
  };

  return {
    closed: hidden,
    entries,
    fix,
    hasMore: cursor !== null || loadedOpen < remaining,
    loading,
    more,
    remaining,
    skip,
    sweep,
  };
}
