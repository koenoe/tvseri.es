import type { ReactNode } from 'react';

import { Ghost } from '@/components/ui/ghost/ghosts';
import BaseLane, {
  LaneGhost as BaseLaneGhost,
} from '@/components/ui/lane/Lane';
import { STATS_LANE } from '@/components/ui/lane/laneLooks';

const DOT = (
  <span aria-hidden className="size-2 shrink-0 rounded-full bg-white" />
);
const GHOST_DOT = <Ghost className="size-2 shrink-0 rounded-full" />;

/**
 * A block on a dark card (`.st-lane`): the shared lane panel in Stats' look
 * (`STATS_LANE`), headed by a white dot, the 18px name and an optional count
 * badge (`.st-lanehead`, the plain number), with something on the right.
 */
export default function Lane({
  aside,
  badge,
  children,
  className,
  id,
  title,
}: Readonly<{
  aside?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  id: string;
  title: ReactNode;
}>) {
  return (
    <BaseLane
      aside={aside}
      className={className}
      count={badge}
      dot={DOT}
      id={id}
      look={STATS_LANE}
      title={title}
    >
      {children}
    </BaseLane>
  );
}

/**
 * A lane while it streams (skeletons mirror the block, flat ghosts only): the card's box (`className` gives its measured size where the
 * content's height follows the data), the dot as a flat shape, the static
 * name as real text (a name that carries data is a bar), then the body's
 * ghosts. The card pulses as one layer.
 */
export function LaneGhost({
  children,
  className,
  title,
}: Readonly<{ children: ReactNode; className?: string; title: ReactNode }>) {
  return (
    <BaseLaneGhost
      className={className}
      dot={GHOST_DOT}
      look={STATS_LANE}
      title={title}
    >
      {children}
    </BaseLaneGhost>
  );
}
