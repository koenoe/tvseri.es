'use client';

import { cva, cx, type VariantProps } from 'class-variance-authority';
import {
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from 'motion/react';
import { memo, useLayoutEffect, useRef } from 'react';

import getHistoryKey from '@/utils/getHistoryKey';
import { wasBackNavigation } from '@/utils/navigationState';

import ListScrollBar, { getScrollableWidth } from './ListScrollBar';
// TODO: convert to Tailwind
import styles from './styles.module.css';

// In-memory cache for scroll positions, keyed by `${scrollRestoreKey}:${historyKey}`
// Using Map instead of sessionStorage because:
// 1. Faster (no serialization)
// 2. Automatically cleared on refresh (desired behavior)
// 3. Works with Activity-based caching where components don't unmount
const scrollCache = new Map<string, number>();

const innerStyles = cva(
  'relative flex w-full flex-nowrap overflow-x-scroll pt-6 pb-6 md:pb-6 md:pt-6 lg:pb-10 lg:pt-7 scrollbar-hide',
);

export const innerStylesWithModuleStyles = () => {
  return cx(innerStyles(), styles.inner);
};

export type HeaderVariantProps = VariantProps<typeof headerVariants>;
export const headerVariants = cva(
  'container relative flex items-center justify-between gap-8 md:gap-10',
  {
    defaultVariants: {
      titleAlignment: 'left',
    },
    variants: {
      titleAlignment: {
        left: [],
        right: ['flex-row-reverse'],
      },
    },
  },
);

type Props = Omit<React.AllHTMLAttributes<HTMLDivElement>, 'title'> &
  HeaderVariantProps &
  Readonly<{
    button?: React.ReactNode;
    children: React.ReactNode;
    scrollBarClassName?: string;
    scrollRestoreKey: string;
    title?: React.ReactNode;
  }>;

function List({
  button,
  children,
  className,
  scrollBarClassName,
  scrollRestoreKey,
  style,
  title,
  titleAlignment,
}: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollXProgress = useMotionValue(0);
  const springScrollLeft = useSpring(0, {
    bounce: 0,
    damping: 30,
    mass: 1,
    stiffness: 300,
  });

  // Track historyKey to detect Activity reveal (when route is revealed but component didn't remount)
  const historyKeyRef = useRef<string | null>(null);

  const { scrollX } = useScroll({
    axis: 'x',
    container: innerRef,
  });

  useMotionValueEvent(scrollX, 'change', (value) => {
    const scrollableWidth = getScrollableWidth(innerRef.current);
    if (scrollableWidth > 0) {
      scrollXProgress.set(value / scrollableWidth);
    }
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount/unmount and historyKey changes
  useLayoutEffect(() => {
    const currentHistoryKey = getHistoryKey();
    const previousHistoryKey = historyKeyRef.current;
    const isActivityReveal =
      previousHistoryKey !== null && previousHistoryKey !== currentHistoryKey;

    // Update ref for next render
    historyKeyRef.current = currentHistoryKey;

    const cacheKey = `${scrollRestoreKey}:${currentHistoryKey}`;
    const container = innerRef.current;

    // Only restore scroll position on back navigation
    // For Activity reveals on forward navigation, start fresh at scroll 0
    const shouldRestore = wasBackNavigation();
    const cachedScrollOffset = scrollCache.get(cacheKey);

    if (shouldRestore && cachedScrollOffset !== undefined && container) {
      // Back navigation - restore scroll position instantly
      container.scrollTo({ left: cachedScrollOffset });
      springScrollLeft.jump(cachedScrollOffset);

      const scrollableWidth = getScrollableWidth(container);
      if (scrollableWidth > 0) {
        scrollXProgress.jump(cachedScrollOffset / scrollableWidth);
      }
    } else if (isActivityReveal && container) {
      // Activity reveal on forward navigation - reset to start
      container.scrollTo({ left: 0 });
      springScrollLeft.jump(0);
      scrollXProgress.jump(0);
    }

    // Save scroll position on cleanup (navigating away from this route)
    return () => {
      if (container && container.scrollLeft > 0) {
        scrollCache.set(cacheKey, container.scrollLeft);
      }
    };
  }, [getHistoryKey()]);

  return (
    <div className={cx('relative w-full select-none', className)} style={style}>
      <div className={headerVariants({ titleAlignment })}>
        {typeof title === 'string' ? (
          <h2 className="text-2xl font-medium lg:text-3xl">{title}</h2>
        ) : (
          title
        )}
        <ListScrollBar
          className={scrollBarClassName}
          containerRef={innerRef}
          scrollXProgress={scrollXProgress}
          springScrollLeft={springScrollLeft}
        />
        {button}
      </div>
      <div className={innerStylesWithModuleStyles()} ref={innerRef}>
        {children}
      </div>
    </div>
  );
}

List.displayName = 'List';

export default memo(List);
