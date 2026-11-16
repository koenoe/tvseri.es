'use client';

import { cva } from 'class-variance-authority';
import * as m from 'motion/react-m';
import { memo, type ReactNode, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { STANDARD_EASE } from '@/components/motion/ease';
import MaxMotion from '@/components/motion/MaxMotion';
import cn from '@/lib/cn';
import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import { useHeaderStore } from './HeaderStoreProvider';
import useNamedHeader from './useNamedHeader';

const HEADER_VARIANTS = {
  floating: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: -100 },
  // the phone menu is open: the transparent bar over its glass
  menu: { opacity: 1, y: 0 },
  // a phone page's name bar: always there, on the page
  named: { opacity: 1, y: 0 },
  static: { opacity: 1, y: 0 },
} as const;

/*
 * The header's glass: four layers, in this order.
 * Under everything shadow-lg (clipped by the pill's overflow, as there); the
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

/*
 * The boards' geometry. The bar: the 1280px page container, 32px from the
 * top (64px tall on a phone), the page gutter at the sides. The pill:
 * 1024px wide, 24px from the top, padded 16px 24px, radius 12; on
 * a phone 12px from the edges and the top, padded 16px 20px, so
 * its content sits 32px in, on the page gutter.
 */
// Its own compositor layer: sliding and fading the header (and the page
// scrolling under the fixed pill) then repaint nothing but the header,
// not the whole document.
// `--scroll-lock-gap`: a scroll lock took a classic scroll bar away (scrollLock)
const headerStyles = cva(
  'top-0 left-0 right-(--scroll-lock-gap,0px) z-40 will-change-transform',
  {
    variants: {
      mode: {
        floating: 'fixed',
        // scrolled away: no clicks, but keyboard focus brings it back
        hidden: 'pointer-events-none fixed',
        // over the phone menu: the bar, fixed at the top of the screen
        menu: 'fixed',
        // the phone's name bar: fixed on the page ground, no line
        named: 'fixed',
        static: 'absolute',
      },
    },
  },
);

const containerStyles = cva('', {
  variants: {
    layout: {
      floating: 'mx-auto max-w-[1088px] px-3 pt-3 md:px-8 md:pt-6',
      static: 'mx-auto w-full max-w-page',
    },
  },
});

const navStyles = cva('relative', {
  variants: {
    layout: {
      floating: 'overflow-hidden rounded-12',
      static: 'overflow-visible rounded-none',
    },
  },
});

const contentStyles = cva('relative z-4 flex items-center', {
  variants: {
    layout: {
      floating: 'justify-between gap-8 px-5 py-4 md:px-6',
      // 64px tall on phones, 32px top from md in the 1280px
      // page container; the sides are the page gutter
      static: 'h-16 w-full justify-stretch px-gutter md:h-auto md:pt-8',
    },
  },
});

/**
 * The header's three looks (port of MorphingHeader): the static bar, the
 * frosted floating pill, hidden. The mode comes from the header store
 * (HeaderScrollTracker); only changes to or from the pill animate. Motion
 * respects reduced motion here (moves and layout morphs become instant).
 * Keyboard focus moving into the hidden header shows the pill.
 */
function HeaderFrame({ children }: Readonly<{ children: ReactNode }>) {
  const isPhone = useMediaQuery(PHONE);
  const { mode, previousMode, revealOnFocus } = useHeaderStore(
    useShallow((state) => ({
      mode: state.mode,
      previousMode: state.previousMode,
      revealOnFocus: state.revealOnFocus,
    })),
  );

  const pageName = useNamedHeader();
  const named = pageName !== null;
  // While the phone menu is open the header is the transparent bar at the
  // top over its glass; opened from the pill, the pill settles into the bar
  // (the same 300ms morph) and comes back on close
  const phoneMenu = useHeaderStore((state) => isPhone && state.menuOpen);
  // Scrolled on a landing's phone page the header is the name bar, whichever
  // way the page scrolls (the pill and the hidden bar step aside)
  const visual = phoneMenu ? 'menu' : named ? 'named' : mode;
  const isFloating = visual === 'floating';
  const layout = isFloating || visual === 'hidden' ? 'floating' : 'static';
  const shouldAnimate =
    previousMode === 'floating' || mode === 'floating' || named;

  const headerTransition = useMemo(
    () => ({ duration: shouldAnimate ? 0.3 : 0, ease: STANDARD_EASE }),
    [shouldAnimate],
  );

  const layoutTransition = useMemo(
    () => ({
      layout: { duration: shouldAnimate ? 0.4 : 0, ease: STANDARD_EASE },
    }),
    [shouldAnimate],
  );

  const opacityTransition = useMemo(
    () => ({ duration: shouldAnimate ? 0.2 : 0 }),
    [shouldAnimate],
  );

  const glassOpacity = useMemo(
    () => ({ opacity: isFloating ? 1 : 0 }),
    [isFloating],
  );

  // Layout morphs need domMax (MaxMotion); until it loads the bar draws its
  // current mode without animating
  return (
    <MaxMotion>
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
      <m.header
        animate={visual}
        className={headerStyles({ mode: visual })}
        data-header-mode={visual}
        data-header-named={named}
        initial={false}
        onFocus={revealOnFocus}
        transition={headerTransition}
        variants={HEADER_VARIANTS}
      >
        <m.div
          className={containerStyles({ layout })}
          initial={false}
          layout
          layoutDependency={isFloating}
          transition={layoutTransition}
        >
          <m.div
            className={cn(navStyles({ layout }), named && 'bg-page')}
            initial={false}
            layout
            layoutDependency={isFloating}
            transition={layoutTransition}
          >
            <m.div
              animate={glassOpacity}
              className={cn(GLASS_LAYER, 'z-0 shadow-lg')}
              data-header-glass-layer="shadow"
              initial={HIDDEN_LAYER}
              transition={opacityTransition}
            />
            <m.div
              animate={glassOpacity}
              className={cn(GLASS_LAYER, 'z-1', GLASS_BLUR)}
              data-header-glass
              data-header-glass-layer="blur"
              initial={HIDDEN_LAYER}
              transition={opacityTransition}
            />
            <m.div
              animate={glassOpacity}
              className={cn(GLASS_LAYER, 'z-2 bg-white/10')}
              data-header-glass-layer="white"
              initial={HIDDEN_LAYER}
              transition={opacityTransition}
            />
            <m.div
              animate={glassOpacity}
              className={cn(GLASS_LAYER, 'z-3')}
              data-header-glass-layer="edge"
              initial={HIDDEN_LAYER}
              style={GLASS_EDGE_STYLE}
              transition={opacityTransition}
            />

            <m.div
              className={contentStyles({ layout })}
              initial={false}
              layout
              layoutDependency={isFloating}
              transition={layoutTransition}
            >
              {children}
            </m.div>
          </m.div>
        </m.div>
      </m.header>
    </MaxMotion>
  );
}

HeaderFrame.displayName = 'HeaderFrame';

export default memo(HeaderFrame);
