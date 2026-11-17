import type { ComponentProps, ReactNode } from 'react';

import StreamedSlot from '@/components/ui/StreamedSlot';

import RowErrorBoundary from './RowErrorBoundary';

/**
 * A streamed section that fails on its own (the rest of the page stays), at
 * the size it held while it streamed: `fallback` while it loads, and on a
 * failure the row error (`RowErrorBoundary`, its props as the section's
 * skeleton has them): a tile row as its failed row, any other section over
 * its own `placeholder` (the same node as `fallback`), so a failure moves
 * nothing below it.
 *
 * @example
 * <GuardedSection id="hidden-gems" fallback={<RowSkeleton id="hidden-gems" title="Hidden gems" />} title="Hidden gems">
 *   <HiddenGems />
 * </GuardedSection>
 */
export default function GuardedSection({
  children,
  fallback,
  ...error
}: Omit<ComponentProps<typeof RowErrorBoundary>, 'children'> &
  Readonly<{
    children: ReactNode;
    /** the section's space while it streams in */
    fallback: ReactNode;
  }>) {
  const guard = (slot: ReactNode) => (
    <RowErrorBoundary {...error}>{slot}</RowErrorBoundary>
  );
  return (
    <StreamedSlot fallback={fallback} guard={guard}>
      {children}
    </StreamedSlot>
  );
}
