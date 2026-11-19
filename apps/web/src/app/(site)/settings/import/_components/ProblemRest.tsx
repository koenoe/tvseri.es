'use client';

import { useCallback } from 'react';

import type { Fix } from '../../_components/problems/fix';
import { rowsIn } from '../../_components/problems/problemRows';
import {
  type ProblemItem,
  rowCount,
} from '../../_components/problems/problems';
import RestItem from '../../_components/problems/RestItem';
import type { Importer } from '../_lib/useImporter';

/** The summed-up rest of a group, skipped (or brought back) all at once. */
export default function ProblemRest({
  fixes,
  importer,
  items,
  onShow,
  skipLabel,
  title,
  toast,
  why,
}: Readonly<{
  fixes: Readonly<Record<string, Fix>>;
  importer: Importer;
  items: ReadonlyArray<ProblemItem>;
  onShow: () => void;
  skipLabel: string;
  title: string;
  toast: string;
  why: string;
}>) {
  const keys = items.map((item) => item.key);
  const rows = rowsIn(items);
  const allSkipped = keys.every((key) => fixes[key]?.kind === 'skipped');
  const { clearFix, skip: skipKeys } = importer;
  const skip = useCallback(
    () => skipKeys({ keys: keys.filter((key) => !fixes[key]), rows, toast }),
    [skipKeys, keys, fixes, rows, toast],
  );
  const undo = useCallback(() => {
    for (const key of keys) {
      clearFix(key);
    }
  }, [clearFix, keys]);
  const count = rowCount(rows);
  const skipped = allSkipped ? rows : 0;
  return (
    <RestItem
      count={count}
      onShow={onShow}
      onSkip={skip}
      onUndo={undo}
      skipLabel={skipLabel}
      skipped={skipped}
      title={title}
      why={why}
    />
  );
}
