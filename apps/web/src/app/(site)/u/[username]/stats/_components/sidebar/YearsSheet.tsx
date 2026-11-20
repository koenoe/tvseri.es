'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { Dialog } from '@/components/ui/dialog/Dialog';

import { pillStyles } from './pillStyles';

/**
 * "More" on the phone's pill row: opens the full Years list in a bottom
 * sheet. The sheet is open only on the page it was opened on, so choosing a
 * year (a link) closes it by navigating, with no effect to do it.
 */
export default function YearsSheet({
  children,
}: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const classes = pillStyles();
  const show = () => setOpenedOn(pathname);
  const onOpenChange = (next: boolean) => setOpenedOn(next ? pathname : null);
  return (
    <>
      {/* the name starts with the visible word, so voice control finds it */}
      <button
        aria-haspopup="dialog"
        className={classes}
        onClick={show}
        type="button"
      >
        More<span className="sr-only"> years</span>
      </button>
      <Dialog onOpenChange={onOpenChange} open={open} title="Years">
        {children}
      </Dialog>
    </>
  );
}
