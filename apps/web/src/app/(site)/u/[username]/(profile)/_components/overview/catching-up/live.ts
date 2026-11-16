import { CATCHING_UP_MIN } from '@tvseri.es/constants';
import {
  type CatchingUpItem,
  parseEpisodeCode,
  toEpisodeCode,
} from '@tvseri.es/schemas';

import { markedIn, openEpisodes } from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';
import { minutesLeftWithout } from './runway';

/**
 * The run's marks in the store: which of the episodes the API sent have
 * one (`sent`, indices), and the episodes after the last of them that are
 * still open (`after`, codes, in order). `null` while the show isn't seeded.
 */
function runMarks(item: CatchingUpItem, view: SeriesBase | undefined) {
  if (!view) {
    return null;
  }
  const isMarked = markedIn(view);
  const sent = item.episodes.flatMap((code, index) =>
    isMarked(code) ? [index] : [],
  );
  const last = parseEpisodeCode(item.episodes.at(-1) ?? '');
  const after = last
    ? openEpisodes(view)
        .filter(
          (ref) =>
            ref.seasonNumber > last.seasonNumber ||
            (ref.seasonNumber === last.seasonNumber &&
              ref.episodeNumber > last.episodeNumber),
        )
        .map((ref) => toEpisodeCode(ref.seasonNumber, ref.episodeNumber))
    : [];
  return { after, sent };
}

/**
 * A Catching up item (`GET /me/overview`) as the marking store has the show
 * now, the way `liveUpNext` follows Up next. Anchored on the episodes the
 * API sent: while none of them has a mark, the server's item, untouched.
 * Once some do (a chip, the Remote, the show page in the same tab), they
 * leave the run and the next ones slide into their spots: the rest of the
 * codes sent, then the show's open episodes after them from the store (the
 * API sends eight), so the run never runs dry before the next overview
 * comes. The count, the time left (each marked episode's own runtime; none
 * once an episode past the codes sent is marked, its runtime isn't known)
 * and Next up follow; an Undo or a failed write brings them back. `null`
 * when nothing is left waiting (the show leaves Catching up, as it does on
 * the next load).
 */
export function liveCatchingUp(
  item: CatchingUpItem,
  view: SeriesBase | undefined,
): CatchingUpItem | null {
  const marks = runMarks(item, view);
  if (!marks || marks.sent.length === 0) {
    return item;
  }
  // the waiting episodes past the codes sent, as the API counted them, less
  // the ones the store has open now: those got a mark since
  const pastSent = Math.max(0, item.waiting - item.episodes.length);
  const markedPast = Math.max(0, pastSent - marks.after.length);
  const waiting = item.waiting - marks.sent.length - markedPast;
  if (waiting <= 0) {
    return null;
  }
  const open = (_: unknown, index: number) => !marks.sent.includes(index);
  const episodes = [...item.episodes.filter(open), ...marks.after].slice(
    0,
    item.episodes.length,
  );
  const runtimes = item.episodeRuntimes.filter(open);
  return {
    ...item,
    // a runtime the API didn't send is unknown (0): its hint says no time
    episodeRuntimes: episodes.map((_, index) => runtimes[index] ?? 0),
    episodes,
    nextUp: episodes[0] ?? item.nextUp,
    runtimeMinutes:
      markedPast > 0 ? null : minutesLeftWithout(item, marks.sent),
    waiting,
  };
}

/**
 * After a mark settles: does the row need the overview again? When the
 * marks used up every episode the API sent (the run goes on from the store
 * meanwhile, without runtimes), or took the show out of Catching up (below
 * `CATCHING_UP_MIN`, or nothing left). Not before: a refresh puts the
 * server's item ahead of the store, so an Undo after it can't move the run
 * back.
 */
export function needsFreshRun(
  item: CatchingUpItem,
  view: SeriesBase | undefined,
): boolean {
  const live = liveCatchingUp(item, view);
  if (live === item) {
    return false;
  }
  return (
    live === null ||
    live.waiting < CATCHING_UP_MIN ||
    runMarks(item, view)?.sent.length === item.episodes.length
  );
}
