'use client';

import { useCallback, useRef } from 'react';

import { cva, cx, type VariantProps } from 'class-variance-authority';
import {
  useScroll,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
} from 'framer-motion';

// TODO: convert to Tailwind
import getMousePositionX from '@/utils/getMousePositionX';

import styles from './styles.module.css';

const innerStyles = cva(
  'relative flex w-full flex-nowrap overflow-x-scroll pt-6 pb-6 md:pb-6 md:pt-6 lg:pb-10 lg:pt-7 scrollbar-hide',
);

export const innerStylesWithModuleStyles = () => {
  return cx(innerStyles(), styles.inner);
};

export type HeaderVariantProps = VariantProps<typeof headerVariants>;
export const headerVariants = cva(
  'container relative flex items-center justify-between gap-8 md:gap-16',
  {
    variants: {
      titleAlignment: {
        left: [],
        right: ['flex-row-reverse'],
      },
    },
    defaultVariants: {
      titleAlignment: 'left',
    },
  },
);

type Props = React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ children: React.ReactNode }>;

function List({ children, className, title, titleAlignment, style }: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const scrollXProgress = useMotionValue(0);
  const scrollLeft = useMotionValue(0);
  const springScrollLeft = useSpring(scrollLeft, {
    stiffness: 300,
    damping: 30,
    mass: 1,
    bounce: 0,
  });

  const { scrollX } = useScroll({
    container: innerRef,
    axis: 'x',
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

      const x = getMousePositionX(event as MouseEvent, scrollBarRef.current);
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

      const x = getMousePositionX(event.nativeEvent, scrollBarRef.current);
      const scrollWidth = innerRef.current?.scrollWidth ?? 0;
      const clientWidth = innerRef.current?.clientWidth ?? 0;
      const scrollableWidth = scrollWidth - clientWidth;
      const left = x * scrollableWidth;

      scrollLeft.set(left);
    },
    [scrollLeft],
  );

  return (
    <div style={style} className={cx('relative w-full', className)}>
      <div className={headerVariants({ titleAlignment })}>
        {title && <h2 className="text-2xl font-medium lg:text-3xl">{title}</h2>}
        <div className="flex-grow">
          <div
            ref={scrollBarRef}
            className="relative h-2 w-full cursor-pointer overflow-hidden rounded-2xl bg-white/15"
            onClick={handleClick}
            onMouseDown={handleStartDragging}
            onTouchStart={handleStartDragging}
          >
            <motion.div
              className="h-full w-full bg-white"
              style={{
                scaleX: scrollXProgress,
                transformOrigin: 'left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
          </div>
        </div>
      </div>
      <div ref={innerRef} className={innerStylesWithModuleStyles()}>
        {children}
      </div>
    </div>
  );
}

export default List;
