import type { ReactNode } from 'react';

import CodeBadge from '@/components/ui/button/CodeBadge';
import { FLAT } from '@/components/ui/ghost/ghosts';
import MetaRow from '@/components/ui/meta/MetaRow';
import { SEGMENTS_CLASS } from '@/components/ui/progress/Segments';
import cn from '@/lib/cn';

import type { LaneRowGhostLayout, LaneRowLayout } from './laneRowLayout';

/** A typical season's episodes, as empty segments */
const SEGMENTS = Array.from({ length: 8 }, (_, n) => n);

/**
 * A lane row while it streams, in the row's own boxes (`LaneRowLayout`): the
 * place's poster and title-line ghosts, the empty segments, the code badge as
 * a flat box and the facts' ghost, the controls' ghosts at the end. It carries
 * the fill only: the placeholder around it pulses once.
 */
export default function LaneRowGhost({
  className,
  end,
  facts,
  ghost,
  layout,
  poster,
  title,
}: Readonly<{
  className?: string;
  /** The controls' ghosts (`ghostCircle`) */
  end: ReactNode;
  /** The facts' ghost after the code badge */
  facts: ReactNode;
  /** The placeholder's own box and segment fill */
  ghost: LaneRowGhostLayout;
  layout: LaneRowLayout;
  poster: ReactNode;
  /** The title line's ghosts (the title, the count) */
  title: ReactNode;
}>) {
  const Text = layout.textAs ?? 'div';
  const row = cn(ghost.row, className);
  return (
    <div className={row}>
      {poster}
      <Text className={layout.text}>
        {layout.titleLine ? (
          <div className={layout.titleLine}>{title}</div>
        ) : (
          title
        )}
        {ghost.segment ? (
          <div className={SEGMENTS_CLASS}>
            {SEGMENTS.map((n) => (
              <i className={ghost.segment} key={n} />
            ))}
          </div>
        ) : null}
        <MetaRow className={layout.meta} fit={layout.metaFit}>
          <CodeBadge className={FLAT} size={layout.code} />
          {facts}
        </MetaRow>
      </Text>
      {end}
    </div>
  );
}
