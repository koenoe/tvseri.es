import type { ReactNode } from 'react';
import Badge from '@/components/ui/button/Badge';
import { FLAT, Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import { LaneGhost as BaseLaneGhost } from '@/components/ui/lane/Lane';
import { PROFILE_LANE } from '@/components/ui/lane/laneLooks';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { LANE_LINK_CLASS, LANE_ROW } from './Lane';
import { SHOW_ALL_CLASS } from './laneCaps';

const DOT = <Ghost className="size-2 shrink-0 rounded-full" />;
const COUNT = <Badge className={FLAT} variant="count" />;

/**
 * A lane while it streams (skeletons mirror the component):
 * the lane's own panel and header with the real title, the dot and the
 * count as flat shapes, the link as a bar, then the rows' ghosts. The panel
 * pulses as one layer; the ghosts inside carry the fill only.
 */
export default function LaneGhost({
  children,
  className,
  count = true,
  link,
  title,
}: Readonly<{
  children: ReactNode;
  /** The lane shows a count pill beside its title (Coming up has none) */
  count?: boolean;
  /** The panel's own size or tint where the lane sets one */
  className?: string;
  /** The header link's ghost (`LinkGhost`) */
  link?: ReactNode;
  title: string;
}>) {
  const pill = count ? COUNT : undefined;
  const aside = link ? <span className={LANE_LINK_CLASS}>{link}</span> : null;
  return (
    <BaseLaneGhost
      aside={aside}
      className={className}
      count={pill}
      dot={DOT}
      look={PROFILE_LANE}
      title={title}
    >
      {children}
    </BaseLaneGhost>
  );
}

/** A lane row's box with the ghost fill in place of the row's own */
export const LANE_ROW_GHOST = cn(LANE_ROW, GHOST_FILL);

/**
 * A header link ("All in progress ›"): a bar in its line box. `alone`: in a
 * section head over a block that pulses on its own, so the bar pulses too
 */
export function LinkGhost({
  alone = false,
  width,
}: Readonly<{ alone?: boolean; width: string }>) {
  const line = cn('text-body-sm', alone && PULSE);
  return <TextLine className={line} width={width} />;
}

/** A capped lane's foot ("Show all 22"): a bar in the foot's box */
export function ShowAllGhost() {
  return (
    <span className={SHOW_ALL_CLASS}>
      <TextLine className="text-body-sm" width="w-20" />
    </span>
  );
}

/** A ghost row of `count` copies (the lane's typical rows) */
export function GhostRows({
  children,
  className,
  count,
}: Readonly<{ children: ReactNode; className: string; count: number }>) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div className="contents" key={index}>
          {children}
        </div>
      ))}
    </div>
  );
}
