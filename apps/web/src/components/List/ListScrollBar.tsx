'use client';

import { cx } from 'class-variance-authority';
import { type MotionValue, motion, useMotionValueEvent } from 'motion/react';
import { memo, useCallback, useRef } from 'react';

import getMousePositionWithinElement from '@/utils/getMousePositionWithinElement';

type Props = Readonly<{
  className?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollXProgress: MotionValue<number>;
  springScrollLeft: MotionValue<number>;
}>;

function getScrollableWidth(container: HTMLElement | null): number {
  if (!container) return 0;
  return container.scrollWidth - container.clientWidth;
}

function ListScrollBar({
  className,
  containerRef,
  scrollXProgress,
  springScrollLeft,
}: Props) {
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  useMotionValueEvent(springScrollLeft, 'change', (left) => {
    containerRef.current?.scrollTo({ left });
  });

  const handleDragging = useCallback(
    (event: Event) => {
      if (!isDragging.current) return;

      const { x } = getMousePositionWithinElement(
        event as MouseEvent,
        scrollBarRef.current,
      );
      const scrollableWidth = getScrollableWidth(containerRef.current);
      const left = x * scrollableWidth;

      springScrollLeft.set(left);
    },
    [containerRef, springScrollLeft],
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
      if (isDragging.current) return;

      const { x } = getMousePositionWithinElement(
        event.nativeEvent,
        scrollBarRef.current,
      );
      const scrollableWidth = getScrollableWidth(containerRef.current);
      const left = x * scrollableWidth;

      springScrollLeft.set(left);
    },
    [containerRef, springScrollLeft],
  );

  return (
    <div className="hidden flex-grow md:flex">
      <div
        className={cx(
          'relative h-2 w-full cursor-pointer overflow-hidden rounded-2xl bg-white/10',
          className,
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
  );
}

ListScrollBar.displayName = 'ListScrollBar';

export { getScrollableWidth };
export default memo(ListScrollBar);
