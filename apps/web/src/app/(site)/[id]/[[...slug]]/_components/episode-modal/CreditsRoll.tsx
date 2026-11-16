'use client';

import { memo, useCallback, useRef } from 'react';
import { WIDE_LG } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';
import CreditBlocks from './CreditBlocks';
import type { RollBlock } from './episodeCredits';

/** The roll's pace (EPBEndCredits production note: 30px/s, two passes). */
const PX_PER_SECOND = 30;

/**
 * Masks the roll's top and bottom 14% (EP-B `ep-b-cred`); below `lg` (phones
 * and tablets, where the modal stacks) the credits are a plain list (no
 * roll, no mask).
 */
const ROLL_CLASSES =
  'absolute top-16 right-12 bottom-16 w-[min(420px,calc(100%-820px))] min-w-[300px] overflow-hidden max-lg:static max-lg:w-auto max-lg:min-w-0 max-lg:overflow-visible max-lg:px-5 max-lg:pt-4 lg:[mask-image:linear-gradient(180deg,transparent_0%,#000_14%,#000_86%,transparent_100%)]';

/**
 * The end credits (EP-B): role over name, name | character, rolling up the
 * right side at 30px/s for two passes, then still. Hover or focus pauses it.
 * Transform only, on the compositor (WAAPI); still on phones, where it's a
 * plain list under the faces.
 */
function CreditsRoll({
  blocks,
}: Readonly<{ blocks: ReadonlyArray<RollBlock> }>) {
  const animation = useRef<Animation | null>(null);

  const roll = useCallback((node: HTMLDivElement | null) => {
    if (!node || !matchesNow(WIDE_LG)) {
      return;
    }
    // One read at mount: half the doubled list is one pass.
    const pass = node.scrollHeight / 2;
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
    animation.current.finished.then(settle, settle);
    return () => {
      animation.current?.cancel();
      animation.current = null;
    };
  }, []);

  const pause = useCallback(() => animation.current?.pause(), []);
  const play = useCallback(() => {
    if (animation.current?.playState === 'paused') {
      animation.current.play();
    }
  }, []);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Credits"
      className={ROLL_CLASSES}
      onBlur={play}
      onFocus={pause}
      onPointerEnter={pause}
      onPointerLeave={play}
    >
      <div className="flex flex-col" ref={roll}>
        <CreditBlocks blocks={blocks} />
        <CreditBlocks blocks={blocks} copy />
      </div>
    </section>
  );
}

const MemoCreditsRoll = memo(CreditsRoll);
MemoCreditsRoll.displayName = 'CreditsRoll';
export default MemoCreditsRoll;
