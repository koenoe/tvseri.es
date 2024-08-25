'use client';

import {
  useRef,
  type ReactNode,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';

import { motion } from 'framer-motion';

import Modal from '../Modal';

export type Position = Readonly<{
  x: number;
  y: number;
}>;

const variants = {
  visible: {
    opacity: 1,
    y: 0,
  },
  hidden: {
    opacity: 0,
    y: 40,
  },
};

const calculateNextPosition = (
  currentPosition: [number, number],
  rect: DOMRect,
  _window: typeof window,
) => {
  const { innerWidth, innerHeight } = _window;
  const width = rect.width;
  const height = rect.height;

  let [x, y] = currentPosition;

  if (y + height > innerHeight) {
    y -= height;
  }

  if (x + width > innerWidth) {
    x -= width;
  }

  return [Math.max(0, x), Math.max(0, y)];
};

type Props = Readonly<{
  children: ReactNode;
  position: Position;
  onOutsideClick?: () => void;
}>;

export default function DropdownContainer({
  children,
  position,
  onOutsideClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const reposition = useCallback(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    const rect = el.getBoundingClientRect();

    const [x, y] = calculateNextPosition(
      [position?.x ?? 0, position?.y ?? 0],
      rect,
      window,
    );

    el.style.top = `${y}px`;
    el.style.left = `${x}px`;

    setIsVisible(true);
  }, [position]);

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      reposition();
    });
  }, [reposition]);

  return (
    <Modal>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-30 bg-transparent"
        onClick={onOutsideClick}
      />
      <motion.div
        key="container"
        ref={ref}
        animate={isVisible ? 'visible' : 'hidden'}
        className="fixed z-40"
        initial="hidden"
        exit="hidden"
        variants={variants}
      >
        {children}
      </motion.div>
    </Modal>
  );
}
