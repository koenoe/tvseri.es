import type { ReactNode } from 'react';
import RollingCount from '@/components/motion/RollingCount';
import Dot, { type DotTone } from '@/components/ui/lane/Dot';
import BaseLane from '@/components/ui/lane/Lane';
import { PROFILE_LANE } from '@/components/ui/lane/laneLooks';

type Props = Readonly<{
  children: ReactNode;
  className?: string;
  /** Shown as the count pill beside the title (left out at 0 or undefined) */
  count?: number;
  dot: DotTone;
  /** A background class that fills the dot in its own colour (`Dot`'s `colour`) */
  dotColour?: string;
  /** The cyan glow (Out now only) */
  glow?: boolean;
  /** Empty: the dot as a ring */
  hollow?: boolean;
  id: string;
  /** "All in progress ›": a `HeadLink` (or any node) at the end of the header */
  link?: ReactNode;
  title: string;
}>;

/**
 * The header's link or action ("All in progress ›", Hide all): at the row's
 * end, beside the title and count; on a phone it wraps under them only when
 * the row can't hold all three
 */
export const LANE_LINK_CLASS = 'ml-auto flex min-w-0';

/**
 * A lane's body as one block (its rows, or its empty state, swapping in as
 * one: `SwapIn`): the panel's own column and gap, so nothing moves
 */
export const LANE_BODY = 'flex flex-col gap-2.5';

/** A lane's row panel: poster, lines, a control */
export const LANE_ROW = 'flex items-center gap-4 rounded-12 bg-white/4 p-3.5';

/**
 * One block of the two lanes under Up next: the shared lane panel
 * (`PROFILE_LANE`) with the profile's dot, its count grouped ("1,234",
 * rolling as marks move it: `RollingCount`) and
 * the header link or action at the row's end.
 */
export default function Lane({
  children,
  className,
  count,
  dot,
  dotColour,
  glow,
  hollow,
  id,
  link,
  title,
}: Props) {
  // it rolls when this tab's marks move it, as the shell's counts do
  const pill = count ? <RollingCount value={count} /> : undefined;
  const marker = (
    <Dot colour={dotColour} glow={glow} hollow={hollow} tone={dot} />
  );
  const aside = link ? <span className={LANE_LINK_CLASS}>{link}</span> : null;
  return (
    <BaseLane
      aside={aside}
      className={className}
      count={pill}
      dot={marker}
      id={id}
      look={PROFILE_LANE}
      title={title}
    >
      {children}
    </BaseLane>
  );
}
