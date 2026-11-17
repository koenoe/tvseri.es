'use client';

import * as m from 'motion/react-m';
import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';

import MaxMotion from '@/components/motion/MaxMotion';
import PositionLayout from '@/components/motion/PositionLayout';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';

import { ACCORDION, SLICE, SLICE_PICTURE } from './sliceLayout';

export type AccordionSlice = Readonly<{
  /** Stretches with the slice */
  backdrop: ReactNode;
  /** Keeps its size; only its position follows */
  content: ReactNode;
  id: number;
}>;

const RADIUS = { borderRadius: 12 } as const;

const SLICE_CLASS = `${SLICE} bg-ground-deep`;

/** A fast start, a long settle */
const OPEN = { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] } as const;

/**
 * The backdrop accordion, one component for the profile's
 * Favourites and Stats' Finished in the year: the first slice is open; hovering or focusing
 * another opens it and the rest narrow to slices; leaving puts the first
 * back. The widths change at once and Motion's layout (FLIP) animation
 * plays them as transforms, with the content only translating, so no layout
 * or paint runs per frame. Each slice arrives rendered; this tracks which is
 * open (`data-open`). On a touch screen (no hover) the first tap on a
 * closed slice opens it; the second follows the link. A mouse has opened
 * the slice by hovering it, so its click always follows the link, and so
 * does Enter on a focused one.
 */
export default function SliceAccordion({
  slices,
}: Readonly<{ slices: ReadonlyArray<AccordionSlice> }>) {
  const [open, setOpen] = useState(0);
  // a finger leaves when it lifts: only a hovering pointer leaving puts the
  // first back
  const reset = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') {
      setOpen(0);
    }
  }, []);
  const resetOnBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(0);
    }
  }, []);
  return (
    <MaxMotion>
      <div className={ACCORDION} onBlur={resetOnBlur} onPointerLeave={reset}>
        {slices.map((slice, index) => (
          <Slice
            index={index}
            isOpen={index === open}
            key={slice.id}
            onOpen={setOpen}
            slice={slice}
          />
        ))}
      </div>
    </MaxMotion>
  );
}

function Slice({
  index,
  isOpen,
  onOpen,
  slice,
}: Readonly<{
  index: number;
  isOpen: boolean;
  onOpen: (index: number) => void;
  slice: AccordionSlice;
}>) {
  const hover = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'touch') {
        onOpen(index);
      }
    },
    [index, onOpen],
  );
  const ref = useRef<HTMLDivElement>(null);
  const focus = useCallback(() => onOpen(index), [index, onOpen]);
  // Whether the slice was closed when a finger came down (a mouse or a pen
  // has opened it by hovering). Read at the press, not at the click: a tap
  // focuses the link before its click, and focusing opens the slice, so by
  // the click it is already open.
  const tapOnClosed = useRef(false);
  const press = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      tapOnClosed.current = event.pointerType === 'touch' && !isOpen;
    },
    [isOpen],
  );
  const tapOpens = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const opening = tapOnClosed.current;
      tapOnClosed.current = false;
      // `detail` 0: a click from the keyboard (Enter), never a tap
      if (opening && event.detail > 0) {
        event.preventDefault();
        onOpen(index);
      }
    },
    [index, onOpen],
  );
  // While its size animates the slice is `data-moving`: the resting hairline
  // (`SliceRing`, in the content layer that keeps its size) would sit at the
  // new size inside the old one, so it hides until the slice settles. Set on
  // the element, not in state, so it lands in the frame the animation starts.
  const moving = useCallback(() => {
    if (ref.current) {
      ref.current.dataset.moving = 'true';
    }
  }, []);
  const settled = useCallback(() => {
    if (ref.current) {
      delete ref.current.dataset.moving;
    }
  }, []);
  return (
    <m.div
      className={SLICE_CLASS}
      data-open={isOpen}
      layout
      onClickCapture={tapOpens}
      onFocus={focus}
      onLayoutAnimationComplete={settled}
      onLayoutAnimationStart={moving}
      onPointerDownCapture={press}
      onPointerEnter={hover}
      ref={ref}
      style={RADIUS}
      transition={OPEN}
    >
      {/* the picture, its veil and its shade: one layer, so the slice's
          rounded corners clip them together, also while it grows. Inside
          it the picture keeps the open slice's size and only follows the
          slice's position: the slice reveals it, the picture never stretches
          while the slice grows or shrinks */}
      <div className={PICTURE_LAYER}>
        <PositionLayout className={SLICE_PICTURE} transition={OPEN}>
          {slice.backdrop}
        </PositionLayout>
      </div>
      <PositionLayout className="absolute inset-0" transition={OPEN}>
        {slice.content}
      </PositionLayout>
    </m.div>
  );
}
