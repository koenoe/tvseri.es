/**
 * The one rule for every mark control (an eye, a pill, a scope eye, a lane's
 * circle): a press starts one write, and nothing else is pressed by accident
 * while it is out. Marking moves things: the Next up pill re-renders for the
 * next episode in the same spot, a row moves on, a reflowed tile's eye or the
 * eye a stack's Show uncovers lands where the pointer just clicked. So:
 *
 * - The second (third…) click of a multi-click is never a press, wherever
 *   it lands and however fast the first write settled (`detail > 1`).
 * - A control is inert while its own write is out (`key`: the episode, the
 *   scope, or the show's Next up for controls that follow it), so a
 *   keyboard repeat or an impatient click can't press it again.
 * - A pointer press at the spot of a press whose write is still out is
 *   refused: a double-tap (taps often report `detail` 1) can't press what
 *   slid in there.
 *
 * The control re-arms when the write settles (or fails). Presses on other
 * controls elsewhere go through at once, so quick marks still merge into
 * one toast. Keyboard and assistive-tech presses (`detail` 0) have no spot.
 */

/** What the gate needs from a click (a React or DOM `MouseEvent` fits) */
export type PressInfo = Readonly<{
  clientX: number;
  clientY: number;
  detail: number;
}>;

type Press = Readonly<{ key: string; x: number; y: number; pointer: boolean }>;

/** How close a click must be to a pending one to count as the same spot */
const SPOT_PX = 12;

const pending = new Set<Press>();

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  'then' in value &&
  typeof value.then === 'function';

const sameSpot = (press: Press, info: PressInfo) =>
  press.pointer &&
  Math.hypot(press.x - info.clientX, press.y - info.clientY) <= SPOT_PX;

/**
 * Runs `run` for this press unless the rule above refuses it. `run` returns
 * the write's promise (a command's result); the control stays inert until it
 * settles. True when it ran.
 *
 * @example
 * <button onClick={(event) => pressMark(`${seriesId}:next`, event, () => marking.toggleEpisode(…))} />
 */
export function pressMark(
  key: string,
  info: PressInfo | null,
  run: () => unknown,
): boolean {
  if (info && info.detail > 1) {
    return false;
  }
  const pointer = info !== null && info.detail === 1;
  for (const press of pending) {
    if (press.key === key || (pointer && info && sameSpot(press, info))) {
      return false;
    }
  }
  const result = run();
  if (!isThenable(result)) {
    return true;
  }
  const press: Press = {
    key,
    pointer,
    x: info?.clientX ?? 0,
    y: info?.clientY ?? 0,
  };
  pending.add(press);
  const release = () => {
    pending.delete(press);
  };
  result.then(release, release);
  return true;
}

/** The key of a control that follows the show's Next up (pill, lane, row) */
export const nextKey = (seriesId: number) => `${seriesId}:next`;

/** The key of one episode's controls */
export const episodeKey = (seriesId: number, code: string) =>
  `${seriesId}:${code}`;

/** The key of a season's or the whole show's eye */
export const scopeKey = (seriesId: number, seasonNumber?: number) =>
  `${seriesId}:${seasonNumber === undefined ? 'all' : `S${seasonNumber}`}`;

/** Tests: forget every pending press. */
export function resetPressGate(): void {
  pending.clear();
}
