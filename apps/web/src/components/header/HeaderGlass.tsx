'use client';

import type { Transition } from 'motion/react';
import * as m from 'motion/react-m';
import { memo, useMemo } from 'react';

import cn from '@/lib/cn';

/*
 * The header's glass: four layers, in this order.
 * Under everything shadow-lg (clipped by the pill's overflow); the
 * page under the pill blurred 4px and run through the turbulence displacement
 * (`#glass-distortion`), saturate 120% and brightness 115%; white/10 over it;
 * a 1px light edge top left. No tint of our own.
 * The blur only works while no ancestor is a backdrop root: the header
 * promotes itself with `will-change: transform` only (an `opacity` there
 * made it one, and the pill showed the page sharp under white/10).
 */
// On a slow device (`data-flat-glass`) the
// distortion is the one thing the pill drops.
const GLASS_BLUR =
  'backdrop-blur-[4px] [filter:url(#glass-distortion)_saturate(120%)_brightness(1.15)] [html[data-flat-glass]_&]:[filter:saturate(120%)_brightness(1.15)]';

const GLASS_EDGE_STYLE = {
  boxShadow: 'inset 1px 1px 1px rgb(255 255 255 / 0.15)',
} as const;

const GLASS_LAYER = 'absolute inset-0 rounded-12';

const HIDDEN_LAYER = { opacity: 0 } as const;

const SHADOW = cn(GLASS_LAYER, 'z-0 shadow-lg');
const BLUR = cn(GLASS_LAYER, 'z-1', GLASS_BLUR);
const WHITE = cn(GLASS_LAYER, 'z-2 bg-white/10');
const EDGE = cn(GLASS_LAYER, 'z-3');

/** The SVG filter the glass blur runs the page through (`#glass-distortion`). */
export function GlassDistortion() {
  return (
    <svg aria-hidden="true" className="pointer-events-none fixed size-0">
      <defs>
        <filter id="glass-distortion">
          <feTurbulence
            baseFrequency="0.008"
            numOctaves="2"
            result="noise"
            type="turbulence"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="77" />
        </filter>
      </defs>
    </svg>
  );
}

type Props = Readonly<{
  /** The floating pill: the glass fades in; any other look, out */
  shown: boolean;
  transition: Transition;
}>;

/** The floating pill's glass, its four layers fading together. */
function HeaderGlass({ shown, transition }: Props) {
  const opacity = useMemo(() => ({ opacity: shown ? 1 : 0 }), [shown]);
  return (
    <>
      <m.div
        animate={opacity}
        className={SHADOW}
        data-header-glass-layer="shadow"
        initial={HIDDEN_LAYER}
        transition={transition}
      />
      <m.div
        animate={opacity}
        className={BLUR}
        data-header-glass
        data-header-glass-layer="blur"
        initial={HIDDEN_LAYER}
        transition={transition}
      />
      <m.div
        animate={opacity}
        className={WHITE}
        data-header-glass-layer="white"
        initial={HIDDEN_LAYER}
        transition={transition}
      />
      <m.div
        animate={opacity}
        className={EDGE}
        data-header-glass-layer="edge"
        initial={HIDDEN_LAYER}
        style={GLASS_EDGE_STYLE}
        transition={transition}
      />
    </>
  );
}

HeaderGlass.displayName = 'HeaderGlass';

export default memo(HeaderGlass);
