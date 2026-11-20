'use client';

import * as m from 'motion/react-m';
import type { CSSProperties } from 'react';

import { SWAP_FROM, SWAP_IN } from '@/components/motion/swap';
import Button from '@/components/ui/button/Button';
import { clockGlyph, copyGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { showToast } from '@/components/ui/toast/showToast';
import cn from '@/lib/cn';

import { SM_BUTTON } from '../../_lib/appButtons';
import type { Countdown } from './usePairing';

/** One digit's slot: the sign-in code page's and the extension's look */
const SLOT_CLASS =
  'flex h-16 w-14 items-center justify-center rounded-12 bg-black/32 text-numeral tabular-nums shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]';

/** The digits rise in as a swap does (200ms), one after another 40ms apart */
const riseAfter = (index: number) =>
  ({
    ...SWAP_IN,
    transition: { ...SWAP_IN.transition, delay: index * 0.04 },
  }) as const;

/**
 * An expired code's strike: the digit again, struck through, drawn from
 * the left in 200ms over the plain one, so it rests exactly where
 * `line-through` puts it. Snaps with reduced motion (globals.css).
 */
const STRIKE_CLASS =
  'absolute inset-0 line-through transition-[clip-path] duration-200 ease-out [clip-path:inset(0_0_0_0)] starting:[clip-path:inset(0_100%_0_0)]';

/**
 * The code's life: 2px, as wide as the digits, shrinking toward the left
 * as the time runs out. Each second's tick slides it on linearly, so it
 * moves without a frame loop; with reduced motion it steps each second.
 */
const BAR_CLASS =
  'h-0.5 origin-left rounded-full bg-white/40 transition-transform duration-1000 ease-linear';

function Digit({
  digit,
  expired,
  index,
}: Readonly<{ digit: string; expired: boolean; index: number }>) {
  const rise = riseAfter(index);
  return (
    <m.span
      animate={rise}
      aria-hidden="true"
      className={SLOT_CLASS}
      initial={SWAP_FROM}
    >
      <span className="relative">
        {digit}
        {expired ? <span className={STRIKE_CLASS}>{digit}</span> : null}
      </span>
    </m.span>
  );
}

/**
 * The link code as four large slots, the shape the extension asks for, its
 * life as a bar under them, with the time left and Copy beside it. Copy
 * confirms with a toast, as Plex's URL does (the toaster is a live region,
 * so a screen reader hears it too).
 */
export default function LinkCodeField({
  code,
  countdown,
  expired,
}: Readonly<{ code: string; countdown: Countdown; expired: boolean }>) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast({ title: 'Copied your code' });
    } catch {
      // No clipboard (an insecure context, a refused permission): the code
      // is on screen to type
      showToast({
        title: 'Couldn’t copy the code. Type it in.',
        tone: 'error',
      });
    }
  };

  const slotsClass = cn('flex gap-2', expired ? 'text-white/60' : 'text-white');
  const digits = [...code];
  const label = `Your code: ${digits.join(' ')}`;
  const left = expired ? 'Expired' : `Valid for ${countdown.text}`;
  const life = { transform: `scaleX(${countdown.left})` } as CSSProperties;
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
      <div className="flex flex-col gap-2">
        <p aria-label={label} className={slotsClass}>
          {digits.map((digit, index) => (
            // The code's digits repeat, so their place is the key; a new
            // code is new digits, which rise in again
            <Digit
              digit={digit}
              expired={expired}
              index={index}
              key={`${code}-${index}`}
            />
          ))}
        </p>
        <span aria-hidden="true" className={BAR_CLASS} style={life} />
      </div>
      {/* centred on the digits' 64px, not on the digits and the bar */}
      <div className="flex h-16 flex-col items-start justify-center gap-2">
        <span className="flex items-center gap-1.5 text-meta text-white/60 tabular-nums">
          <Icon glyph={clockGlyph} size={13} />
          {left}
        </span>
        <Button
          className={SM_BUTTON}
          disabled={expired}
          icon={copyGlyph}
          onClick={copy}
          variant="tonal"
        >
          Copy
        </Button>
      </div>
    </div>
  );
}
