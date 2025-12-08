'use client';

import { cva } from 'class-variance-authority';
import { motion, useScroll } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useMemo } from 'react';

import logo from '@/assets/logo.svg';
import useMatchMedia from '@/hooks/useMatchMedia';

import { useHeaderStore } from './Header/HeaderStoreProvider';

const EASE_CURVE = [0.25, 0.1, 0.25, 1] as const;

const linkStyles = cva('z-10 flex items-center', {
  defaultVariants: {
    state: 'enabled',
  },
  variants: {
    state: {
      disabled: 'pointer-events-none',
      enabled: '',
    },
  },
});

const containerStyles = cva('flex items-center', {
  defaultVariants: {
    layout: 'static',
  },
  variants: {
    layout: {
      floating: 'gap-3',
      static: 'gap-3 md:gap-4',
    },
  },
});

const iconStyles = cva('mt-[-4px]', {
  defaultVariants: {
    layout: 'static',
  },
  variants: {
    layout: {
      floating: 'size-[22px]',
      static: 'size-[22px] md:size-[24px]',
    },
  },
});

const textStyles = cva('font-semibold uppercase leading-none tracking-widest', {
  defaultVariants: {
    layout: 'static',
  },
  variants: {
    layout: {
      floating: 'text-base',
      static: 'text-base md:text-lg',
    },
  },
});

function Logo({ priority = false }: Readonly<{ priority?: boolean }>) {
  const { scrollY } = useScroll();
  const mode = useHeaderStore((state) => state.mode);
  const isMenuOpen = useHeaderStore((state) => state.menuOpen);
  const isMobile = useMatchMedia('(max-width: 768px)');

  const isFloating = useMemo(() => mode !== 'static', [mode]);
  const isDisabled = useMemo(
    () => isMenuOpen && isMobile,
    [isMenuOpen, isMobile],
  );
  const layout = useMemo(
    () => (isFloating ? 'floating' : 'static'),
    [isFloating],
  );

  // Skip animation when at scroll position 0 and in static mode (navigation just occurred)
  const isNavigationReset = useMemo(
    () => mode === 'static' && scrollY.get() === 0,
    [mode, scrollY],
  );

  const transition = useMemo(
    () => ({
      duration: isNavigationReset ? 0 : 0.25,
      ease: EASE_CURVE,
    }),
    [isNavigationReset],
  );

  const state = useMemo(
    () => (isDisabled ? 'disabled' : 'enabled'),
    [isDisabled],
  );
  const opacity = useMemo(() => (isDisabled ? 0.1 : 1), [isDisabled]);

  return (
    <Link className={linkStyles({ state })} href="/" replace>
      <motion.div
        animate={{ opacity }}
        className={containerStyles({ layout })}
        initial={false}
        transition={transition}
      >
        <div className={iconStyles({ layout })}>
          <Image
            alt=""
            className="h-full w-full"
            height={24}
            priority={priority}
            src={logo}
            width={24}
          />
        </div>
        <span className={textStyles({ layout })}>tvseri.es</span>
      </motion.div>
    </Link>
  );
}

Logo.displayName = 'Logo';

export default memo(Logo);
