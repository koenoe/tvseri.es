import { CATCHING_UP_MIN } from '@tvseri.es/constants';
import {
  type CatchingUpItem,
  episodeCode,
  parseEpisodeCode,
} from '@tvseri.es/schemas';

import { markedIn, openEpisodes } from '@/lib/marking/progress';
import type { EpisodeRef, SeriesBase } from '@/lib/marking/types';

import { minutesLeftWithout } from './runway';

const rank = (ref: EpisodeRef) =>
  ref.seasonNumber * 100_000 + ref.episodeNumber;

const rankOf = (code: string | undefined) => {
  const ref = parseEpisodeCode(code ?? '');
  return ref ? rank(ref) : null;
};

/**
 * The run's marks in the store: which of the episodes the API sent have
 * one (`sent`, indices); the open episodes before the first of them
 * (`before`: the API had them marked, an Undo or an unmark since opened
 * them again) and after the last of them (`after`), as codes in order.
 * `null` while the show isn't seeded.
 */
function runMarks(item: CatchingUpItem, view: SeriesBase | undefined) {
  if (!view) {
    return null;
  }
  const isMarked = markedIn(view);
  const sent = item.episodes.flatMap((code, index) =>
    isMarked(code) ? [index] : [],
  );
  const first = rankOf(item.episodes[0]);
  const last = rankOf(item.episodes.at(-1));
  const open = openEpisodes(view);
  const codes = (keep: (at: number) => boolean) =>
    open.filter((ref) => keep(rank(ref))).map((ref) => episodeCode(ref));
  return {
    after: last === null ? [] : codes((at) => at > last),
    before: first === null ? [] : codes((at) => at < first),
    sent,
  };
}

/**
 * A Catching up item (`GET /me/overview`) as the marking store has the show
 * now, the way `liveUpNext` follows Up next. Anchored on the episodes the
 * API sent: while none of them has a mark and nothing before them was
 * opened again, the server's item, untouched. Otherwise the marked ones
 * leave the run and the next ones slide into their spots: the rest of the
 * codes sent, then the show's open episodes after them from the store (the
 * API sends eight), so the run never runs dry before the next overview
 * comes. Episodes before the codes sent that are open again (an Undo after
 * the overview was read) come first. The count, the time left (each marked
 * episode's own runtime; none where a runtime isn't known) and Next up
 * follow; an Undo or a failed write brings them back. `null` when nothing
 * is left waiting (the show leaves Catching up, as it does on the next
 * load).
 */
export function liveCatchingUp(
  item: CatchingUpItem,
  view: SeriesBase | undefined,
): CatchingUpItem | null {
  const marks = runMarks(item, view);
  if (!marks || (marks.sent.length === 0 && marks.before.length === 0)) {
    return item;
  }
  // the waiting episodes past the codes sent, as the API counted them, less
  // the ones the store has open now: those got a mark since
  const pastSent = Math.max(0, item.waiting - item.episodes.length);
  const markedPast = Math.max(0, pastSent - marks.after.length);
  const waiting =
    item.waiting + marks.before.length - marks.sent.length - markedPast;
  if (waiting <= 0) {
    return null;
  }
  const open = (_: unknown, index: number) => !marks.sent.includes(index);
  const episodes = [
    ...marks.before,
    ...item.episodes.filter(open),
    ...marks.after,
  ].slice(0, item.episodes.length);
  // a runtime the API didn't send is unknown (0): its hint says no time
  const runtimes = [
    ...marks.before.map(() => 0),
    ...item.episodeRuntimes.filter(open),
  ];
  return {
    ...item,
    episodeRuntimes: episodes.map((_, index) => runtimes[index] ?? 0),
    episodes,
    nextUp: episodes[0] ?? item.nextUp,
    runtimeMinutes:
      markedPast > 0 || marks.before.length > 0
        ? null
        : minutesLeftWithout(item, marks.sent),
    waiting,
  };
}

/**
 * Is the server's item out of date against the show's settled marks (the
 * store's `base`)? When they used up every episode the API sent (the run
 * goes on from the store meanwhile, without runtimes), took the show out
 * of Catching up (below `CATCHING_UP_MIN`, or nothing left), or opened an
 * episode before the codes sent again (an Undo after a refresh). Not
 * sooner: a refresh puts the server's item ahead of the store.
 */
export function needsFreshRun(
  item: CatchingUpItem,
  view: SeriesBase | undefined,
): boolean {
  const live = liveCatchingUp(item, view);
  if (live === item) {
    return false;
  }
  const marks = runMarks(item, view);
  return (
    live === null ||
    live.waiting < CATCHING_UP_MIN ||
    marks?.sent.length === item.episodes.length ||
    (marks?.before.length ?? 0) > 0
  );
}
