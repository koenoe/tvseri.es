'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { getRowPosition, type RowPosition } from '@/components/ui/row/paging';

/**
 * The phone row fades on the side that has more tabs: the right at the
 * start, both in the middle, the left at the end, none when they all fit.
 * Each side is a mask layer twice the row's width with its fade at one end;
 * sliding it 18% out of the box turns that fade off, so a fade comes and
 * goes over 150ms instead of popping mid-swipe (a mask-image can't
 * transition, its position can). The first measure fades in the same way.
 */
const FADE =
  'max-md:[mask-image:linear-gradient(90deg,transparent,#000_9%),linear-gradient(270deg,transparent,#000_9%)] max-md:[mask-size:200%_100%] max-md:[mask-repeat:no-repeat] max-md:[mask-composite:intersect] max-md:[mask-position:18%_0,82%_0] max-md:transition-[mask-position] max-md:duration-150 max-md:ease-out max-md:data-[edge=start]:[mask-position:18%_0,100%_0] max-md:data-[edge=middle]:[mask-position:0%_0,100%_0] max-md:data-[edge=end]:[mask-position:0%_0,82%_0]';

/** The bar: its fill and corners stay whole while the tabs fade inside it */
const FRAME =
  'flex h-14 items-center bg-black/22 max-md:h-[58px] max-md:rounded-14 md:rounded-18 md:p-2.5';

/** What scrolls on a phone; positioned, so a tab's offsetLeft is its own */
const SCROLLER = `relative flex h-full w-full min-w-0 items-center max-md:overflow-x-auto max-md:rounded-14 max-md:p-1 max-md:[scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${FADE}`;

/** The tabs' row: as wide as the tabs on a phone, so the bar scrolls past its end padding */
const ROW =
  'flex h-full items-center max-md:w-max max-md:min-w-full max-md:gap-0.5 md:min-w-0 md:flex-1 md:gap-1 md:overflow-x-auto md:[scrollbar-width:none]';

/**
 * The bar behind the tabs. Desktop: 56px, 10px padding, 18px corners
 * (the pills' 8 plus the padding), the pills in a row. Phone: 58px tall
 * with or without the tabs (the skeleton is the same box), 4px padding,
 * 14px corners; the tabs scroll
 * sideways when they don't fit, with no snapping and no arrows, and fade
 * on the side with more (`TabLinks` keeps the active one in view).
 */
export default function TabsFrame({
  children,
}: Readonly<{ children?: ReactNode }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<RowPosition>('fits');

  const measure = useCallback(() => {
    if (ref.current) {
      setEdge(getRowPosition(ref.current));
    }
  }, []);

  // the row's width follows the screen's
  useEffect(() => {
    const scroller = ref.current;
    if (!scroller) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  return (
    <nav aria-label="Profile" className={FRAME}>
      <div
        className={SCROLLER}
        data-edge={edge}
        data-tab-scroller=""
        onScroll={measure}
        ref={ref}
      >
        <div className={ROW}>{children}</div>
      </div>
    </nav>
  );
}
