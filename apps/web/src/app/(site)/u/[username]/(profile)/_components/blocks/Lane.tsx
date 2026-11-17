import type { ReactNode } from 'react';

import BaseLane from '@/components/ui/lane/Lane';
import { PROFILE_LANE } from '@/components/ui/lane/laneLooks';
import { formatGrouped } from '@/lib/formatCount';

import Dot, { type DotTone } from './Dot';

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
 * The header link's box: its own line on a phone, under the title (past the
 * 8px dot and the 10px gap); at the row's end from `md`
 */
export const LANE_LINK_CLASS =
  'flex basis-full pl-[18px] md:ml-auto md:min-w-0 md:basis-auto md:pl-0';

/** A lane's row panel: poster, lines, a control */
export const LANE_ROW = 'flex items-center gap-4 rounded-12 bg-white/4 p-3.5';

/**
 * One block of the two lanes under Up next: the shared lane panel
 * (`PROFILE_LANE`) with the profile's dot, its count grouped ("1,234") and
 * the header link on its own line on a phone.
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
  const pill = count ? formatGrouped(count) : undefined;
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
