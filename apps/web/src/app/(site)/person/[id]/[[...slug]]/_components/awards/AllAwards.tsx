'use client';

import type { PersonAward } from '@tvseri.es/schemas';
import dynamic from 'next/dynamic';
import { type ReactNode, useState, useTransition } from 'react';

import useBackCloses from '@/components/ui/dialog/useBackCloses';
import { showToast } from '@/components/ui/toast/showToast';
import cn from '@/lib/cn';
import { fetchJson } from '@/lib/series/useCachedJson';

const loadSheet = () => import('./AwardsSheet');

// The sheet's code loads on hover or focus, its list on the first open
// next/dynamic on purpose: this piece is also rendered on the server, which a client-only loader cannot do.
const AwardsSheet = dynamic(loadSheet);

/** The list, or `failed` when its read failed (the sheet says so, with Try again) */
type AwardList = ReadonlyArray<PersonAward> | 'failed';

/**
 * "All 87 nominations ›": opens every award in a side sheet. A list that
 * fails to load opens the sheet with the failure inside it (a rejection
 * must not reach the section's error boundary, which would replace the
 * loaded Awards card); only a sheet whose code can't load says so in a toast.
 */
export default function AllAwards({
  children,
  className,
  name,
  personId,
}: Readonly<{
  children: ReactNode;
  className: string;
  name: string;
  personId: number;
}>) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AwardList | null>(null);
  const [pending, startLoad] = useTransition();
  // Back closes the sheet, as on every side panel
  const dismiss = useBackCloses(open, () => setOpen(false));
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
    } else {
      dismiss();
    }
  };
  const preload = () => {
    void loadSheet();
  };
  const show = () => {
    if (items && items !== 'failed') {
      setOpen(true);
      return;
    }
    startLoad(async () => {
      const [list, sheet] = await Promise.allSettled([
        fetchJson<ReadonlyArray<PersonAward>>(`/api/person/${personId}/awards`),
        loadSheet(),
      ]);
      if (sheet.status === 'rejected') {
        showToast({
          action: { label: 'Try again', onClick: show },
          title: 'The awards didn’t open',
          tone: 'error',
        });
        return;
      }
      setItems(list.status === 'fulfilled' ? list.value : 'failed');
      setOpen(true);
    });
  };
  const classes = cn(className, pending && 'text-white');
  return (
    <>
      <button
        aria-busy={pending}
        aria-haspopup="dialog"
        className={classes}
        onClick={show}
        onFocus={preload}
        onPointerEnter={preload}
        type="button"
      >
        {children}
      </button>
      {items ? (
        <AwardsSheet
          items={items}
          name={name}
          onOpenChange={handleOpenChange}
          onRetry={show}
          open={open}
          retrying={pending}
        />
      ) : null}
    </>
  );
}
