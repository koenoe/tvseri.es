'use client';

import { cva } from 'class-variance-authority';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { memo, useMemo, useRef } from 'react';

import { useHeaderStore } from './HeaderStoreProvider';
import type { HeaderMode } from './store';

const SCROLL_THRESHOLD = 60;

const EASE_CURVE = [0.25, 0.1, 0.25, 1] as const;

const HEADER_VARIANTS = {
  floating: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: -100 },
  static: { opacity: 1, y: 0 },
} as const;

const GLASS_BLUR_STYLE = {
  backdropFilter: 'blur(4px)',
  filter: 'url(#glass-distortion) saturate(120%) brightness(1.15)',
  WebkitBackdropFilter: 'blur(4px)',
} as const;

const GLASS_SHADOW_STYLE = {
  boxShadow: 'inset 1px 1px 1px rgba(255, 255, 255, 0.15)',
} as const;

const headerStyles = cva('inset-x-0 top-0 z-[40] w-screen', {
  defaultVariants: {
    layout: 'static',
  },
  variants: {
    layout: {
      floating: 'fixed',
      static: 'absolute',
    },
  },
});

const containerStyles = cva('', {
  defaultVariants: {
    layout: 'static',
  },
  variants: {
    layout: {
      floating: 'mx-auto max-w-[1088px] px-4 pt-4 md:px-8 md:pt-6',
      static:
        'mx-auto sm:max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-2xl w-full px-4 md:px-0',
    },
  },
});

const navStyles = cva('relative', {
  defaultVariants: {
    layout: 'static',
  },
  variants: {
    layout: {
      floating: 'overflow-hidden rounded-xl',
      static: 'overflow-visible rounded-none',
    },
  },
});

const contentStyles = cva('relative z-[4] flex items-center', {
  defaultVariants: {
    layout: 'static',
  },
  variants: {
    layout: {
      floating: 'justify-between gap-8 py-3 md:py-4 px-6',
      static: 'h-[6rem] w-full justify-stretch md:h-[8rem] md:px-8 px-4',
    },
  },
});

function MorphingHeader({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { scrollY } = useScroll();
  const previousMode = useRef<HeaderMode>('static');
  const lastScrollY = useRef(0);
  const lastPath = useRef<string | null>(null);
  const mode = useHeaderStore((state) => state.mode);
  const setMode = useHeaderStore((state) => state.setMode);

  useMotionValueEvent(scrollY, 'change', (current) => {
    // Detect navigation by checking if path changed
    const currentPath = window.location.pathname + window.location.search;
    if (lastPath.current !== currentPath) {
      lastPath.current = currentPath;
      lastScrollY.current = current;
      previousMode.current = 'static';
      if (mode !== 'static') {
        setMode('static');
      }
      return;
    }

    const previous = lastScrollY.current;
    const scrollingUp = current < previous;
    const pastThreshold = current > SCROLL_THRESHOLD;

    let newMode: HeaderMode;
    if (!pastThreshold) {
      newMode = 'static';
    } else if (scrollingUp) {
      newMode = 'floating';
    } else {
      newMode = 'hidden';
    }

    // Only update state if mode actually changed to prevent unnecessary re-renders
    if (newMode !== mode) {
      previousMode.current = mode;
      setMode(newMode);
    }

    lastScrollY.current = current;
  });

  const isFloating = mode === 'floating';
  const isHidden = mode === 'hidden';
  const layout = mode === 'static' ? 'static' : 'floating';

  // Only animate when transitioning to/from floating state
  const shouldAnimate =
    previousMode.current === 'floating' || mode === 'floating';

  const headerTransition = useMemo(
    () => ({
      duration: shouldAnimate ? 0.3 : 0,
      ease: EASE_CURVE,
    }),
    [shouldAnimate],
  );

  const layoutTransition = useMemo(
    () => ({
      layout: {
        duration: shouldAnimate ? 0.4 : 0,
        ease: EASE_CURVE,
      },
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

  return (
    <>
      <svg aria-hidden="true" className="pointer-events-none fixed h-0 w-0">
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

      <motion.header
        animate={isFloating ? 'floating' : isHidden ? 'hidden' : 'static'}
        className={headerStyles({ layout })}
        initial={false}
        transition={headerTransition}
        variants={HEADER_VARIANTS}
      >
        <motion.div
          className={containerStyles({ layout })}
          initial={false}
          layout
          layoutDependency={isFloating}
          transition={layoutTransition}
        >
          <motion.nav
            className={navStyles({ layout })}
            initial={false}
            layout
            layoutDependency={isFloating}
            transition={layoutTransition}
          >
            {/* Glass Effect Layers - animate opacity */}
            <motion.div
              animate={glassOpacity}
              className="absolute inset-0 z-[1] rounded-xl"
              initial={{ opacity: 0 }}
              style={GLASS_BLUR_STYLE}
              transition={opacityTransition}
            />

            <motion.div
              animate={glassOpacity}
              className="absolute inset-0 z-[2] rounded-xl bg-white/10"
              initial={{ opacity: 0 }}
              transition={opacityTransition}
            />

            <motion.div
              animate={glassOpacity}
              className="absolute inset-0 z-[3] rounded-xl"
              initial={{ opacity: 0 }}
              style={GLASS_SHADOW_STYLE}
              transition={opacityTransition}
            />

            {/* Shadow for floating state */}
            <motion.div
              animate={glassOpacity}
              className="absolute inset-0 z-[0] rounded-xl shadow-lg"
              initial={{ opacity: 0 }}
              transition={opacityTransition}
            />

            {/* Content */}
            <motion.div
              className={contentStyles({ layout })}
              initial={false}
              layout
              layoutDependency={isFloating}
              transition={layoutTransition}
            >
              {children}
            </motion.div>
          </motion.nav>
        </motion.div>
      </motion.header>
    </>
  );
}

MorphingHeader.displayName = 'MorphingHeader';

export default memo(MorphingHeader);
