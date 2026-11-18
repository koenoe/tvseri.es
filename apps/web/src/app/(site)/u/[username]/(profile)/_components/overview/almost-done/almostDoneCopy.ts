import type { AlmostDoneItem } from '@tvseri.es/schemas';
import { formatRuntime, plural } from '@tvseri.es/utils';

/**
 * One segment per episode of the season, empty for each episode the API
 * names as still to watch, wherever it sits: E01 skipped and E02–E06
 * watched is 5 of 6 with the first segment empty.
 */
export function seasonSegments(
  item: Pick<AlmostDoneItem, 'seasonTotal' | 'unwatchedEpisodes'>,
): Readonly<{
  /** Per episode, in order: watched or not */
  segments: ReadonlyArray<boolean>;
  total: number;
  watched: number;
}> {
  const left = new Set(item.unwatchedEpisodes);
  const total = Math.max(item.seasonTotal, ...item.unwatchedEpisodes, 1);
  const segments = Array.from(
    { length: total },
    (_, index) => !left.has(index + 1),
  );
  const watched = segments.filter(Boolean).length;
  return { segments, total, watched };
}

/** "1 to go" */
export const toGoLabel = (toGo: number) => `${toGo} to go`;

/** The words after the time in "52m to finish the season" */
export const FINISH_WORDS = 'to finish the season';

/** "52m to finish the season" (null when the runtime is unknown) */
export function finishLabel(minutes: number | null): string | null {
  const time = formatRuntime(minutes);
  return time ? `${time} ${FINISH_WORDS}` : null;
}

/** "5 of 6 episodes watched": the progress's label */
export function progressLabel(watched: number, total: number): string {
  return `${watched} of ${total} episodes watched`;
}

/** "4 episodes to go" */
export function closestLabel(toGo: number): string {
  return `${plural(toGo, 'episode')} to go`;
}
