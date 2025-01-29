'use client';

import {
  useRef,
  type ReactNode,
  useState,
  useCallback,
  useLayoutEffect,
  type RefObject,
} from 'react';

import { motion, type Variants } from 'framer-motion';

import Modal from '../Modal';

type Alignment = 'start' | 'center' | 'end';
type AxisPosition = number | Alignment;

export type Position = Readonly<{
  x: AxisPosition;
  y: AxisPosition;
}>;

const calculateAlignedPosition = (
  alignment: Alignment,
  start: number,
  triggerSize: number,
  dropdownSize: number,
  offset: number = 0,
): number => {
  switch (alignment) {
    case 'center':
      return start + triggerSize / 2 - dropdownSize / 2 + offset;
    case 'end':
      return start + triggerSize + offset;
    case 'start':
    default:
      return start - offset;
  }
};

const calculateNextPosition = ({
  position,
  triggerRect,
  dropdownRect,
  window: _window,
  viewportOffset = 8,
  alignmentOffset,
}: Readonly<{
  position: Position;
  triggerRect?: DOMRect;
  dropdownRect: DOMRect;
  window: Window;
  viewportOffset?: number;
  alignmentOffset: { x: number; y: number };
}>) => {
  const { innerWidth, innerHeight } = _window;

  if (typeof position.x === 'number' && typeof position.y === 'number') {
    const x = position.x + alignmentOffset.x;
    const y = position.y + alignmentOffset.y;

    return [
      Math.max(
        viewportOffset,
        Math.min(x, innerWidth - dropdownRect.width - viewportOffset),
      ),
      Math.max(
        viewportOffset,
        Math.min(y, innerHeight - dropdownRect.height - viewportOffset),
      ),
    ] as const;
  }

  if (!triggerRect) {
    throw new Error('triggerRect is required for alignment-based positioning');
  }

  let x = calculateAlignedPosition(
    position.x as Alignment,
    triggerRect.left,
    triggerRect.width,
    dropdownRect.width,
    alignmentOffset.x,
  );

  let y = calculateAlignedPosition(
    position.y as Alignment,
    triggerRect.top,
    triggerRect.height,
    dropdownRect.height,
    alignmentOffset.y,
  );

  if (x + dropdownRect.width > innerWidth) {
    x = triggerRect.right - dropdownRect.width - alignmentOffset.x;
  }
  if (x < 0) {
    x = triggerRect.left + alignmentOffset.x;
  }

  if (y + dropdownRect.height > innerHeight) {
    y = triggerRect.top - dropdownRect.height - alignmentOffset.y;
  }
  if (y < 0) {
    y = triggerRect.bottom + alignmentOffset.y;
  }

  x = Math.max(
    viewportOffset,
    Math.min(x, innerWidth - dropdownRect.width - viewportOffset),
  );
  y = Math.max(
    viewportOffset,
    Math.min(y, innerHeight - dropdownRect.height - viewportOffset),
  );

  return [x, y] as const;
};

type Props = Readonly<{
  children: ReactNode;
  triggerRef?: RefObject<HTMLElement | null>;
  position: Position;
  offset?: Readonly<{
    x: number;
    y: number;
  }>;
  onOutsideClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  shouldRenderOverlay?: boolean;
  shouldRenderInModal?: boolean;
  viewportOffset?: number;
  variants?: Variants;
}>;

export default function DropdownContainer({
  children,
  triggerRef,
  position,
  offset = { x: 0, y: 8 },
  onOutsideClick,
  shouldRenderOverlay = true,
  shouldRenderInModal = true,
  viewportOffset = 16,
  variants = {
    visible: {
      opacity: 1,
      y: 0,
    },
    hidden: {
      opacity: 0,
      y: 40,
    },
  },
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const reposition = useCallback(() => {
    const containerEl = containerRef.current;
    if (!containerEl) {
      return;
    }

    if (typeof position.x === 'string' || typeof position.y === 'string') {
      const triggerEl = triggerRef?.current;
      if (!triggerEl) {
        return;
      }

      const triggerRect = triggerEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();

      const [x, y] = calculateNextPosition({
        position,
        triggerRect,
        dropdownRect: containerRect,
        window,
        viewportOffset,
        alignmentOffset: { x: offset.x ?? 0, y: offset.y ?? 8 },
      });

      containerEl.style.top = `${y}px`;
      containerEl.style.left = `${x}px`;
      setIsVisible(true);
      return;
    }

    // For absolute positioning, we don't need the triggerRef
    const containerRect = containerEl.getBoundingClientRect();
    const [x, y] = calculateNextPosition({
      position,
      triggerRect: undefined,
      dropdownRect: containerRect,
      window,
      viewportOffset,
      alignmentOffset: { x: offset.x ?? 0, y: offset.y ?? 8 },
    });

    containerEl.style.top = `${y}px`;
    containerEl.style.left = `${x}px`;
    setIsVisible(true);
  }, [position, viewportOffset, triggerRef, offset]);

  useLayoutEffect(() => {
    const handleResize = () => {
      reposition();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [reposition]);

  useLayoutEffect(() => {
    reposition();
  }, [reposition]);

  const renderContent = useCallback(() => {
    return (
      <>
        {shouldRenderOverlay && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[99] bg-transparent"
            onClick={onOutsideClick}
          />
        )}
        <motion.div
          key="container"
          ref={containerRef}
          animate={isVisible ? 'visible' : 'hidden'}
          className="fixed z-[100]"
          initial="hidden"
          exit="hidden"
          variants={variants}
          onAnimationStart={() => {
            if (!isVisible) reposition();
          }}
        >
          {children}
        </motion.div>
      </>
    );
  }, [
    shouldRenderOverlay,
    onOutsideClick,
    isVisible,
    variants,
    children,
    reposition,
  ]);

  if (shouldRenderInModal) {
    return <Modal>{renderContent()}</Modal>;
  }

  return renderContent();
}
