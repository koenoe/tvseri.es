import type { ReactNode } from 'react';

import StreamedSlot from '@/components/ui/StreamedSlot';

import BlockError from './BlockError';

/**
 * One streamed profile block: its own Suspense hole with the exact-size
 * placeholder, and a failure card the size of that placeholder
 * (`BlockError`), so a failure stays in the block. The placeholder and the
 * content each sit in a plain block (`data-placeholder` / `data-slot`, the
 * block's name from its title) that adds no box of its own: the parity spec
 * measures them.
 * `className` is the content's own layout when it holds more than one block.
 */
export default function Hole({
  bare = false,
  children,
  className,
  fallback,
  look,
  title,
}: Readonly<{
  children: ReactNode;
  className?: string;
  /**
   * No `data-placeholder` / `data-slot` boxes: for a page whose content and
   * skeleton already carry their own markers (the sub-pages)
   */
  bare?: boolean;
  fallback: ReactNode;
  /** a one-or-two-line block: `line`, its failure is one line (`BlockError`) */
  look?: 'card' | 'line';
  title: string;
}>) {
  const name = bare
    ? undefined
    : title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const guard = (slot: ReactNode, placeholder: ReactNode) => (
    <BlockError fallback={placeholder} look={look} title={title}>
      {slot}
    </BlockError>
  );
  return (
    <StreamedSlot
      className={className}
      fallback={fallback}
      guard={guard}
      name={name}
    >
      {children}
    </StreamedSlot>
  );
}
