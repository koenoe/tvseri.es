import type { ConnectionService } from '@tvseri.es/schemas';

import { pollDelay, syncFingerprint } from '../_lib/serviceSync';
import { readStatus } from './readStatus';

/**
 * The page's one poll of its running syncs. Each syncing card registers
 * what it draws; one timer reads every registered card's small status
 * route (5s apart in a sync's first minute, then 30s), and only when an
 * answer differs from what a card draws (its state or counts moved, or it
 * ended) is the page refreshed, once for all of them. A refreshed card
 * registers its new sync; the last card to stop syncing ends the poll. A
 * hidden tab doesn't ask, and asks at once when it shows again. One poll
 * at a time, and one refresh per change while the router redraws.
 */

type Watch = Readonly<{
  /** syncFingerprint of the sync the card draws */
  fingerprint: string;
  /** Re-renders the page from the server (the router's refresh) */
  refresh: () => void;
  /** When the running sync was asked for: its first minute polls faster */
  requestedAt: number;
}>;

const watches = new Map<ConnectionService, Watch>();
let timer: ReturnType<typeof setTimeout> | undefined;
let polling = false;
/**
 * The answer each service was last refreshed for: until its card redraws
 * (and registers anew), the same answer mustn't refresh the page again.
 */
const refreshedFor = new Map<ConnectionService, string>();

const stopTimer = () => {
  clearTimeout(timer);
  timer = undefined;
};

/** The soonest any registered sync wants asking again */
const nextDelay = () =>
  Math.min(
    ...[...watches.values()].map(({ requestedAt }) =>
      pollDelay(Date.now() - requestedAt),
    ),
  );

function schedule() {
  stopTimer();
  if (watches.size > 0 && !document.hidden) {
    timer = setTimeout(poll, nextDelay());
  }
}

async function poll() {
  stopTimer();
  // A tab shown again mid-poll: the poll in flight schedules the next
  if (polling) {
    return;
  }
  polling = true;
  const asked = [...watches.keys()];
  const answers = await Promise.all(asked.map(readStatus)).finally(() => {
    polling = false;
  });
  let refresh: (() => void) | undefined;
  for (const [index, service] of asked.entries()) {
    const answer = answers[index];
    const watch = watches.get(service);
    const fingerprint = answer ? syncFingerprint(answer.sync) : null;
    if (
      watch &&
      fingerprint !== null &&
      fingerprint !== watch.fingerprint &&
      fingerprint !== refreshedFor.get(service)
    ) {
      refreshedFor.set(service, fingerprint);
      refresh ??= watch.refresh;
    }
  }
  // One refresh redraws every card on the page
  refresh?.();
  schedule();
}

const onVisibility = () => {
  if (document.hidden) {
    stopTimer();
    return;
  }
  poll();
};

/** Registers a syncing card; the returned function lets it go. */
export function watchSync(service: ConnectionService, watch: Watch) {
  if (watches.size === 0) {
    document.addEventListener('visibilitychange', onVisibility);
  }
  watches.set(service, watch);
  // The card drew anew, so a later change may refresh again
  refreshedFor.delete(service);
  schedule();
  return () => {
    if (watches.get(service) === watch) {
      watches.delete(service);
    }
    if (watches.size === 0) {
      stopTimer();
      refreshedFor.clear();
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}
