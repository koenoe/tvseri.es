import type { ReactNode } from 'react';

import SectionUnavailable from '@/components/ui/row/SectionUnavailable';

/**
 * A stats block whose API read was unavailable: the shared static
 * "didn't load" state with Try again,
 * baked in for the short `unavailable` life; never a pulsing skeleton. The
 * card sits over the block's own placeholder, settled, so the block keeps
 * its size: no block is a tile row. Its edges are the block's own (`flush`:
 * the Stats column has the gutter).
 */
export default function StatsUnavailable({
  id,
  placeholder,
  title,
}: Readonly<{ id: string; placeholder: ReactNode; title: string }>) {
  return (
    <SectionUnavailable
      id={id}
      inset="flush"
      placeholder={placeholder}
      title={title}
    />
  );
}
