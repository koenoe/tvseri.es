import type { CSSProperties } from 'react';

import type { NetworkLook } from '../_data/look';

type WashStyle = CSSProperties &
  Readonly<{ '--wash-desktop': string; '--wash-phone': string }>;

/**
 * The network's colour (one wash): one radial wash on the page
 * itself, from the very top under the header, ending fully transparent, so
 * it has no box and no edge. A static layer behind everything (no per-frame
 * work); the phone's is smaller.
 */
export default function NetworkWash({
  wash,
}: Readonly<{ wash: NetworkLook['wash'] }>) {
  const style: WashStyle = {
    '--wash-desktop': wash.desktop,
    '--wash-phone': wash.phone,
  };
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[1000px] bg-(image:--wash-phone) md:-top-20 md:bg-(image:--wash-desktop)"
      data-testid="network-wash"
      style={style}
    />
  );
}
