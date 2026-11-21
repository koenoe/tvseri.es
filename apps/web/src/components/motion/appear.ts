import { ENTER } from './iconSwap';

/**
 * A control that appears beside the one that brought it (a confirm under
 * the button that asked, Cancel beside Save once there is something to
 * cancel): it comes in from `offset` on the icon swap's no-bounce spring and
 * fades out softer (150ms, no move). One preset so these stay alike as they
 * are tuned. Spread it on an `m` element inside an `AnimatePresence`, and
 * keep it inert while it leaves (`useIsPresent`). Not for a swap in place
 * (`SwapIn`, `CrossFade`) or an item leaving a list (`LeavingItem`).
 *
 * @example
 * const MOTION = appearFrom({ y: -4 });
 * <m.div inert={leaving} {...MOTION}>…</m.div>
 */
export const appearFrom = (offset: Readonly<{ x: number } | { y: number }>) =>
  ({
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } },
    initial: { opacity: 0, ...offset },
    transition: ENTER,
  }) as const;
