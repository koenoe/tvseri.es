'use client';

import { usePathname } from 'next/navigation';
import { createContext, type ReactNode, use, useRef } from 'react';

import { usePillGlide } from '@/components/motion/usePillGlide';

/** A row was pressed: the current row's highlight glides to it */
const PickContext = createContext<() => void>(() => {});

/** For a row's link: mark the press that opens its section */
export const usePickRow = () => use(PickContext);

/**
 * The sidebar's rows: the current row's highlight (`[data-pill]`, drawn by
 * `NavRow`) glides from the row that was open to the one pressed, as the
 * Library's shelves do (`usePillGlide`). The rows stay server-rendered
 * children; only this list and their links are client.
 */
export default function NavList({
  children,
}: Readonly<{ children: ReactNode }>) {
  const list = useRef<HTMLUListElement>(null);
  const pathname = usePathname();
  const pick = usePillGlide(list, pathname);
  return (
    <PickContext value={pick}>
      <ul className="flex flex-col gap-2 lg:gap-0.5" ref={list}>
        {children}
      </ul>
    </PickContext>
  );
}
