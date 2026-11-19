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
 * start, both in the middle, the left at the end, none when they all fit
 */
const FADE =
  'max-md:data-[edge=start]:[mask-image:linear-gradient(90deg,#000_82%,transparent)] max-md:data-[edge=middle]:[mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)] max-md:data-[edge=end]:[mask-image:linear-gradient(90deg,transparent,#000_18%)]';

const NAV = `relative flex h-14 items-center bg-black/22 max-md:h-[58px] max-md:overflow-x-auto max-md:rounded-14 max-md:p-1 max-md:[scrollbar-width:none] md:rounded-12 md:p-2.5 [&::-webkit-scrollbar]:hidden ${FADE}`;

/** The tabs' row: as wide as the tabs on a phone, so the bar scrolls past its end padding */
const ROW =
  'flex h-full items-center max-md:w-max max-md:min-w-full max-md:gap-0.5 md:min-w-0 md:flex-1 md:gap-1 md:overflow-x-auto md:[scrollbar-width:none]';

/**
 * The bar behind the tabs. Desktop: 56px, 10px padding, 12px corners, the
 * pills in a row. Phone: 58px tall with or without the tabs (the skeleton
 * is the same box), 4px padding, 14px corners; the tabs scroll
 * sideways when they don't fit, with no snapping and no arrows, and fade
 * on the side with more (`TabLinks` keeps the active one in view).
 */
export default function TabsFrame({
  children,
}: Readonly<{ children?: ReactNode }>) {
  const ref = useRef<HTMLElement>(null);
  const [edge, setEdge] = useState<RowPosition>('fits');

  const measure = useCallback(() => {
    if (ref.current) {
      setEdge(getRowPosition(ref.current));
    }
  }, []);

  // the row's width follows the screen's
  useEffect(() => {
    const nav = ref.current;
    if (!nav) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  return (
    <nav
      aria-label="Profile"
      className={NAV}
      data-edge={edge}
      onScroll={measure}
      ref={ref}
    >
      <div className={ROW}>{children}</div>
    </nav>
  );
}
