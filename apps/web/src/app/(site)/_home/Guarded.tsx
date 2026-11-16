import { type ReactNode, Suspense } from 'react';

import type { Glyph } from '@/components/ui/icon/types';
import RowErrorBoundary from '@/components/ui/row/RowErrorBoundary';
import type { RowLook, RowTiles } from '@/components/ui/row/rowLayout';

/**
 * A section that fails on its own (its own error state; the rest of
 * the page stays), at the size it held while it streamed: a tile row as its row
 * error (the row's `look` and subtitle, as its skeleton), any other section
 * over its own `placeholder` (`SectionError`), so a failure moves nothing
 * below it.
 */
export default function Guarded({
  children,
  fallback,
  id,
  look,
  placeholder,
  reserve,
  subtitle,
  subtitleGlyph,
  tiles,
  title,
}: Readonly<{
  children: ReactNode;
  /** the section's space while it streams in */
  fallback: ReactNode;
  id: string;
  look?: RowLook;
  /** a section that isn't a tile row: the same node as `fallback` */
  placeholder?: ReactNode;
  /** the failed row's min-height where its placeholder differs by viewer (Continue watching) */
  reserve?: string;
  subtitle?: string;
  subtitleGlyph?: Glyph;
  /** a tile row's tile kind, so the error's slots take its size */
  tiles?: RowTiles;
  title: string;
}>) {
  return (
    <RowErrorBoundary
      id={id}
      look={look}
      placeholder={placeholder}
      reserve={reserve}
      subtitle={subtitle}
      subtitleGlyph={subtitleGlyph}
      tiles={tiles}
      title={title}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </RowErrorBoundary>
  );
}
