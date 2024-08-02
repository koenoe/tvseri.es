'use client';

import type { TvSeries } from '@/types/tv-series';
import { cva, cx } from 'class-variance-authority';
import { useCallback, useRef } from 'react';
import {
  useScroll,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from 'framer-motion';

import Poster from '../Tiles/Poster';

// TODO: convert to Tailwind
import styles from './styles.module.css';
import getMousePositionX from '@/utils/getMousePositionX';

const innerStyles = cva(
  'relative flex w-full flex-nowrap overflow-x-scroll pt-6 pb-6 md:pb-6 md:pt-6 lg:pb-10 lg:pt-7 scrollbar-hide',
);

export const innerStylesWithModuleStyles = () => {
  return cx(innerStyles(), styles.inner);
};

type Props = React.AllHTMLAttributes<HTMLDivElement> &
  Readonly<{ items: TvSeries[]; priority?: boolean }>;

function List({ className, items, priority, title }: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const scrollXProgress = useMotionValue(0);

  const { scrollX } = useScroll({
    container: innerRef,
    axis: 'x',
  });

  useMotionValueEvent(scrollX, 'change', (value) => {
    const scrollWidth = innerRef.current?.scrollWidth ?? 0;
    const clientWidth = innerRef.current?.clientWidth ?? 0;
    const scrollableWidth = scrollWidth - clientWidth;
    const x = value / scrollableWidth;

    scrollXProgress.set(x);
  });

  const handleDragging = useCallback((event: Event) => {
    if (!isDragging.current) {
      return;
    }

    const x = getMousePositionX(event as MouseEvent, scrollBarRef.current);
    const scrollWidth = innerRef.current?.scrollWidth ?? 0;
    const clientWidth = innerRef.current?.clientWidth ?? 0;
    const scrollableWidth = scrollWidth - clientWidth;
    const left = x * scrollableWidth;

    innerRef.current?.scrollTo({
      left,
      behavior: 'instant',
    });
  }, []);

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

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      return;
    }

    const x = getMousePositionX(event.nativeEvent, scrollBarRef.current);
    const scrollWidth = innerRef.current?.scrollWidth ?? 0;
    const clientWidth = innerRef.current?.clientWidth ?? 0;
    const scrollableWidth = scrollWidth - clientWidth;
    const left = x * scrollableWidth;

    innerRef.current?.scrollTo({
      left,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className={cx('relative w-full', className)}>
      <div className="container relative flex items-center justify-between">
        <h2 className="text-2xl font-medium lg:text-3xl">{title}</h2>
        <div className="ml-10 flex-grow md:ml-16">
          <div
            ref={scrollBarRef}
            className="relative h-2 w-full cursor-pointer overflow-hidden rounded-2xl bg-white/20"
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
        {items.map((item) => (
          <Poster key={item.id} item={item} priority={priority} />
        ))}
      </div>
    </div>
  );
}

export default List;
