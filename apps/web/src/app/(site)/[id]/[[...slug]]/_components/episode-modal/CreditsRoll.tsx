'use client';

import { memo, type PointerEvent, useCallback, useRef, useState } from 'react';
import cn from '@/lib/cn';
import { REDUCED_MOTION, WIDE_LG } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';
import CreditBlocks from './CreditBlocks';
import type { RollBlock } from './episodeCredits';

/** The roll's pace (EPBEndCredits production note: 30px/s, two passes). */
const PX_PER_SECOND = 30;

/**
 * Masks the roll's top and bottom 14%. Below `lg` (phones and tablets,
 * where the modal stacks) it is a box filling the rest of the modal under
 * the faces (at least 240px), its own scroller (no scroll chaining into the
 * modal's), its top and bottom 32px fading out.
 */
const ROLL_CLASSES =
  'absolute top-16 right-12 bottom-16 w-[min(420px,calc(100%-820px))] min-w-[300px] overflow-hidden max-lg:static max-lg:mt-2 max-lg:min-h-[240px] max-lg:w-auto max-lg:min-w-0 max-lg:flex-1 max-lg:basis-0 max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:px-5 max-lg:[mask-image:linear-gradient(180deg,transparent_0,#000_32px,#000_calc(100%-32px),transparent_100%)] lg:[mask-image:linear-gradient(180deg,transparent_0%,#000_14%,#000_86%,transparent_100%)]';

/** The phone's box once still: the list ends clear of the bottom fade */
const STILL_LIST = 'max-lg:pb-8';

/**
 * The desktop box when it never rolls (reduced motion): scrolled by hand
 * instead of clipped, without chaining into the modal
 */
const STILL_BOX = 'lg:overflow-y-auto lg:overscroll-contain';

/**
 * With reduced motion the list never rolls, at any width, so it is still
 * from its first render: drawn once, never doubled and collapsed after mount
 * (a class change after mount is a style change, which the global
 * reduced-motion rule turns into a 0.01ms transition). The roll mounts on
 * the client only: its credits load after hydration.
 */
const stillFromStart = () => matchesNow(REDUCED_MOTION);

/**
 * The end credits: role over name, name | character, rolling up at 30px/s
 * for two passes, then still. Hover or focus pauses it. Transform only, on
 * the compositor (WAAPI). Below `lg` it rolls inside its box under the
 * faces; a touch or a wheel there stops it where it is and the box scrolls
 * by hand from that place, as it does once the roll ends. It doesn't roll
 * with reduced motion (the box scrolls by hand, also on desktop), nor below
 * `lg` when one pass fits the box.
 */
function CreditsRoll({
  blocks,
}: Readonly<{ blocks: ReadonlyArray<RollBlock> }>) {
  const animation = useRef<Animation | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  // The list drawn once: below `lg` once it stops, at any width with reduced
  // motion
  const [still, setStill] = useState(stillFromStart);
  // reduced motion on desktop: the box scrolls instead of rolling
  const [stillBox] = useState(stillFromStart);

  const roll = useCallback((node: HTMLDivElement | null) => {
    list.current = node;
    if (!node || stillFromStart()) {
      return;
    }
    // One read at mount: half the doubled list is one pass.
    const pass = node.scrollHeight / 2;
    if (!matchesNow(WIDE_LG)) {
      const box = node.parentElement;
      if (!box || pass <= box.clientHeight) {
        setStill(true);
        return;
      }
    }
    // Its own layer only while it rolls: the list is still once it ends.
    node.style.willChange = 'transform';
    const settle = () => {
      node.style.willChange = '';
    };
    animation.current = node.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-50%)' }],
      {
        delay: 1000,
        duration: (pass / PX_PER_SECOND) * 1000,
        easing: 'linear',
        iterations: 2,
      },
    );
    animation.current.finished.then(() => {
      settle();
      if (!matchesNow(WIDE_LG)) {
        setStill(true);
      }
    }, settle);
    return () => {
      animation.current?.cancel();
      animation.current = null;
    };
  }, []);

  const pause = useCallback(() => animation.current?.pause(), []);
  // Below `lg`: stop where it is and hand the box to the finger or wheel.
  const stop = useCallback(() => {
    const running = animation.current;
    const node = list.current;
    const box = node?.parentElement;
    if (!running || !node || !box || matchesNow(WIDE_LG)) {
      return;
    }
    const offset = -new DOMMatrixReadOnly(getComputedStyle(node).transform).m42;
    const pass = node.scrollHeight / 2;
    running.cancel();
    animation.current = null;
    box.scrollTop = pass > 0 ? offset % pass : 0;
    setStill(true);
  }, []);
  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'mouse') {
        stop();
      }
    },
    [stop],
  );
  const play = useCallback(() => {
    if (animation.current?.playState === 'paused') {
      animation.current.play();
    }
  }, []);

  if (blocks.length === 0) {
    return null;
  }

  const listClasses = cn('flex flex-col', still && STILL_LIST);
  const boxClasses = cn(ROLL_CLASSES, stillBox && STILL_BOX);

  return (
    <section
      aria-label="Credits"
      className={boxClasses}
      onBlur={play}
      onFocus={pause}
      onPointerDown={onPointerDown}
      onPointerEnter={pause}
      onPointerLeave={play}
      onWheel={stop}
    >
      <div className={listClasses} ref={roll}>
        <CreditBlocks blocks={blocks} />
        {still ? null : <CreditBlocks blocks={blocks} copy />}
      </div>
    </section>
  );
}

const MemoCreditsRoll = memo(CreditsRoll);
MemoCreditsRoll.displayName = 'CreditsRoll';
export default MemoCreditsRoll;
