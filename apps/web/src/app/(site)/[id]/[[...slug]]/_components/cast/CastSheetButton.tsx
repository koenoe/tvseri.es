'use client';

import { type ReactNode, useState } from 'react';

import useBackCloses from '@/components/ui/dialog/useBackCloses';
import { createLoader } from '@/lib/lazy/createLoader';
import { useLoader } from '@/lib/lazy/useLoader';
import { requestJson } from '@/lib/series/useCachedJson';

import { useShow } from '../../_lib/ShowProvider';
import useOpenedOnce from '../../_lib/useOpenedOnce';
import { castAndCrewUrl } from './castSheetData';

// A plain loader, not `next/dynamic`: a chunk that failed is tried again on
// the next press (`loadSheet`), since `open` is already true and its effect
// would not run again
const sheet = createLoader(() =>
  import('./CastSheet').then((module) => module.default),
);

/**
 * What opens the cast & crew sheet: the phone stack, the row's "+N". The
 * faces inside stay server-rendered (`children`); this only adds the press.
 * The sheet's code and its list load on a sign of intent (hover, focus) or
 * the press, together, so it opens at once with its rows' skeleton at worst.
 */
export default function CastSheetButton({
  children,
  className,
  label,
  total,
}: Readonly<{
  children: ReactNode;
  className: string;
  /** the button's name: its faces are decorative */
  label: string;
  /** everyone the sheet lists, for its header */
  total: number;
}>) {
  const show = useShow();
  const [open, setOpen] = useState(false);
  const opened = useOpenedOnce(open);
  const [CastSheet, loadSheet] = useLoader(sheet, open);
  // Back closes it, as every side panel
  const dismiss = useBackCloses(open, () => setOpen(false));
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      dismiss();
    }
  };
  const preload = () => {
    sheet.preload();
    requestJson(castAndCrewUrl(show.id));
  };
  const press = () => {
    requestJson(castAndCrewUrl(show.id));
    loadSheet();
    setOpen(true);
  };
  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={label}
        className={className}
        onClick={press}
        onFocus={preload}
        onPointerEnter={preload}
        type="button"
      >
        {children}
      </button>
      {opened && CastSheet ? (
        <CastSheet
          onOpenChange={handleOpenChange}
          open={open}
          title={show.title}
          total={total}
        />
      ) : null}
    </>
  );
}
