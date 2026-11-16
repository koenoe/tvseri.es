'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useTransition } from 'react';

import RowError, { SectionError } from '@/components/ui/row/RowError';
import type { RowHeading } from '@/components/ui/row/RowHeader';
import type {
  RowInset,
  RowLook,
  RowTiles,
} from '@/components/ui/row/rowLayout';

/**
 * A section whose API read was unavailable : the per-row error, baked into the static page for the
 * short `unavailable` life, never a skeleton that waits forever. Try again
 * refreshes the route; the row says so while it does. A section that isn't
 * a tile row passes its `placeholder`: the failure then keeps its exact
 * space (`SectionError`).
 */
export default function SectionUnavailable({
  id,
  inset,
  look,
  placeholder,
  tiles,
  ...heading
}: Pick<RowHeading, 'subtitle' | 'subtitleGlyph' | 'title'> &
  Readonly<{
    id: string;
    inset?: RowInset;
    /** the row's board look, as its placeholder has it (the header's height follows it) */
    look?: RowLook;
    /** the section's loading placeholder: its size is the failure's (not a tile row) */
    placeholder?: ReactNode;
    tiles?: RowTiles;
  }>) {
  const { title } = heading;
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const retry = () => startRetry(() => router.refresh());
  const state = retrying
    ? ({ state: 'retrying' } as const)
    : ({ onRetry: retry, state: 'failed' } as const);
  if (placeholder) {
    return (
      <SectionError
        inset={inset}
        placeholder={placeholder}
        title={title}
        {...state}
      />
    );
  }
  return (
    <RowError
      {...heading}
      id={id}
      inset={inset}
      look={look}
      tiles={tiles}
      {...state}
    />
  );
}
