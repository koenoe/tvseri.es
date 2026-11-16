'use client';

import type { ReactNode } from 'react';

import type { HelpTab } from '../_lib/importState';
import DropZone from './DropZone';
import HelpCard from './HelpCard';

/**
 * Step 1: the drop zone, the last import's Undo row
 * (`children`, when there is one), then where to get the file.
 */
export default function UploadStep({
  busy,
  children,
  onFiles,
  onTab,
  posters,
  tab,
}: Readonly<{
  busy: boolean;
  children?: ReactNode;
  onFiles: (files: ReadonlyArray<File>) => void;
  onTab: (tab: HelpTab) => void;
  posters: ReadonlyArray<string>;
  tab: HelpTab;
}>) {
  return (
    <>
      <DropZone busy={busy} onFiles={onFiles} posters={posters} />
      {children}
      <HelpCard onTab={onTab} tab={tab} />
    </>
  );
}
