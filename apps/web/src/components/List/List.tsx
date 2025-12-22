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

import ListScrollBar, { getScrollableWidth } from './ListScrollBar';
// TODO: convert to Tailwind
import styles from './styles.module.css';

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount/unmount
  useLayoutEffect(() => {
    const cacheKey = `${scrollRestoreKey}:${getHistoryKey()}`;
    const scrollOffset = sessionStorage.getItem(cacheKey);
    const container = innerRef.current;

    if (scrollOffset && container) {
      const left = parseInt(scrollOffset, 10);
      container.scrollTo({ left });
      sessionStorage.removeItem(cacheKey);

      springScrollLeft.jump(left);

      const scrollableWidth = getScrollableWidth(container);
      if (scrollableWidth > 0) {
        scrollXProgress.jump(left / scrollableWidth);
      }
    }

    return () => {
      if (container && container.scrollLeft > 0) {
        sessionStorage.setItem(cacheKey, String(container.scrollLeft));
      }
    };
  }, []);

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
