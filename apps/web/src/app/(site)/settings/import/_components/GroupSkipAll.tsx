'use client';

import { plural } from '@tvseri.es/utils';
import type { MouseEvent } from 'react';

import { focusGroupHeader } from '../../_components/problems/itemFocus';
import { rowsIn } from '../../_components/problems/problemRows';
import type { ProblemItem } from '../../_components/problems/problems';
import SkipAll from '../../_components/problems/SkipAll';
import type { Importer } from '../_lib/useImporter';

/**
 * A group's Skip all once Show them has shown every item (a sync's
 * review has one): it skips the items still open, each saying "Skipped ·
 * Undo" in its place, one toast with Undo for them all. No confirm: an import's skip
 * can be undone. Nothing is left to skip, so the button goes: its focus
 * goes to the group's header beside it.
 */
export default function GroupSkipAll({
  groupName,
  importer,
  items,
}: Readonly<{
  groupName: string;
  importer: Importer;
  /** The group's items still open */
  items: ReadonlyArray<ProblemItem>;
}>) {
  const skipAll = (event: MouseEvent<HTMLButtonElement>) => {
    if (document.activeElement === event.currentTarget) {
      focusGroupHeader(event.currentTarget);
    }
    const rows = rowsIn(items);
    importer.skip({
      keys: items.map(({ key }) => key),
      rows,
      toast: `Skipped ${plural(rows, 'row')}`,
    });
  };
  return <SkipAll groupName={groupName} onClick={skipAll} />;
}
