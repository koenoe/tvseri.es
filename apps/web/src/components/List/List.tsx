'use client';

import { cva, cx, type VariantProps } from 'class-variance-authority';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from 'motion/react';
import { memo, useCallback, useLayoutEffect, useRef } from 'react';

import getHistoryKey from '@/utils/getHistoryKey';
import getMousePositionWithinElement from '@/utils/getMousePositionWithinElement';

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
    title?: React.ReactNode;
    scrollRestoreKey: string;
    scrollBarClassName?: string;
  }>;

function List({
  button,
  children,
  className,
  title,
  titleAlignment,
  style,
  scrollRestoreKey,
  scrollBarClassName,
}: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const scrollXProgress = useMotionValue(0);
  const scrollLeft = useMotionValue(0);
  const springScrollLeft = useSpring(scrollLeft, {
    bounce: 0,
    damping: 30,
    mass: 1,
    stiffness: 300,
  });

  const { scrollX } = useScroll({
    axis: 'x',
    container: innerRef,
  });

  useMotionValueEvent(springScrollLeft, 'change', (left) => {
    innerRef.current?.scrollTo({
      left,
    });
  });

  useMotionValueEvent(scrollX, 'change', (value) => {
    const scrollWidth = innerRef.current?.scrollWidth ?? 0;
    const clientWidth = innerRef.current?.clientWidth ?? 0;
    const scrollableWidth = scrollWidth - clientWidth;
    const x = value / scrollableWidth;

    scrollXProgress.set(x);
  });

  const handleDragging = useCallback(
    (event: Event) => {
      if (!isDragging.current) {
        return;
      }

      const { x } = getMousePositionWithinElement(
        event as MouseEvent,
        scrollBarRef.current,
      );
      const scrollWidth = innerRef.current?.scrollWidth ?? 0;
      const clientWidth = innerRef.current?.clientWidth ?? 0;
      const scrollableWidth = scrollWidth - clientWidth;
      const left = x * scrollableWidth;

      scrollLeft.set(left);
    },
    [scrollLeft],
  );

  const handleStopDragging = useCallback(() => {
    isDragging.current = false;

    document.removeEventListener('mousemove', handleDragging);
    document.removeEventListener('touchmove', handleDragging);
  }, [handleDragging]);

  const handleStartDragging = useCallback(() => {
    isDragging.current = true;

    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('touchmove', handleDragging);
    document.addEventListener('mouseup', handleStopDragging, { once: true });
    document.addEventListener('touchend', handleStopDragging, { once: true });
  }, [handleDragging, handleStopDragging]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging.current) {
        return;
      }

      const { x } = getMousePositionWithinElement(
        event.nativeEvent,
        scrollBarRef.current,
      );
      const scrollWidth = innerRef.current?.scrollWidth ?? 0;
      const clientWidth = innerRef.current?.clientWidth ?? 0;
      const scrollableWidth = scrollWidth - clientWidth;
      const left = x * scrollableWidth;

      scrollLeft.set(left);
    },
    [scrollLeft],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: ExPlaNatIon
  useLayoutEffect(() => {
    const cacheKey = `${scrollRestoreKey}:${getHistoryKey()}`;
    const scrollOffset = sessionStorage.getItem(cacheKey);
    const container = innerRef.current;

    if (scrollOffset && container) {
      const left = parseInt(scrollOffset, 10);
      container.scrollTo({ left });
      sessionStorage.removeItem(cacheKey);

      scrollLeft.jump(left);
      springScrollLeft.jump(left);

      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const scrollableWidth = scrollWidth - clientWidth;
      if (scrollableWidth > 0) {
        const restoredProgress = left / scrollableWidth;
        scrollXProgress.jump(restoredProgress);
      }
    }

    return () => {
      if (container) {
        const scrollLeft = container.scrollLeft;
        if (scrollLeft > 0) {
          sessionStorage.setItem(cacheKey, String(scrollLeft));
        }
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
        <div className="hidden flex-grow md:flex">
          <div
            className={cx(
              'relative h-2 w-full cursor-pointer overflow-hidden rounded-2xl bg-white/10',
              scrollBarClassName,
            )}
            onClick={handleClick}
            onMouseDown={handleStartDragging}
            onTouchStart={handleStartDragging}
            ref={scrollBarRef}
          >
            <motion.div
              className="h-full w-full bg-white/30"
              style={{
                left: 0,
                position: 'absolute',
                scaleX: scrollXProgress,
                top: 0,
                transformOrigin: 'left',
              }}
            />
          </div>
        </div>
        {button && button}
      </div>
      <div className={innerStylesWithModuleStyles()} ref={innerRef}>
        {children}
      </div>
    </div>
  );
}

export default memo(List);
