import type { ReactNode } from 'react';

import CodeBadge from '@/components/ui/button/CodeBadge';
import MetaRow from '@/components/ui/meta/MetaRow';
import Segments from '@/components/ui/progress/Segments';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';

import type { LaneRowLayout } from './laneRowLayout';

type Props = Readonly<{
  /** `li` in a list of rows */
  as?: 'div' | 'li';
  className?: string;
  /** The place's look (`laneRowLayout.ts`) */
  layout: LaneRowLayout;
  /** The show page: the poster and the title open it. Left out, the row is no link */
  href?: string;
  title: string;
  /** The poster, as the place draws it */
  poster: ReactNode;
  /** "1 to go", beside the title (and in the meta line where the layout says) */
  count?: string;
  /** One segment per episode of the season, watched or not */
  progress?: Readonly<{ label: string; segments: ReadonlyArray<boolean> }>;
  /** `S02E06`, first in the meta line */
  code: string;
  /** The meta line's facts after the code ("52m to finish the season") */
  facts?: ReactNode;
  /** A line under the meta line */
  footnote?: ReactNode;
  /** The controls at the row's end (the place's eye) */
  end: ReactNode;
}>;

/**
 * One row of a lane (Home's In progress, the profile's Almost done and Out
 * now): the poster, the title and its count, the season's segments, the meta
 * line with the code badge, the place's controls at the end. It only draws:
 * each place loads its rows, words its facts, decides whether the row links,
 * and brings its own eye.
 *
 * @example
 * <LaneRow code="S02E06" count="1 to go" end={eye} facts={finish}
 *   layout={ALMOST_DONE_ROW} poster={art} progress={progress} title="Black Doves" />
 */
export default function LaneRow({
  as: Row = 'div',
  className,
  code,
  count,
  end,
  facts,
  footnote,
  href,
  layout,
  poster,
  progress,
  title,
}: Props) {
  const Text = layout.textAs ?? 'div';
  const row = cn(layout.row, className);
  const name = href ? (
    <TileLink className={layout.title} href={href} title={title}>
      {title}
    </TileLink>
  ) : (
    <b className={layout.title}>{title}</b>
  );
  return (
    <Row className={row}>
      {href ? (
        <TileLink
          aria-label={title}
          className="shrink-0"
          href={href}
          tabIndex={-1}
        >
          {poster}
        </TileLink>
      ) : (
        poster
      )}
      <Text className={layout.text}>
        {layout.titleLine ? (
          <div className={layout.titleLine}>
            {name}
            <span className={layout.count}>{count}</span>
          </div>
        ) : (
          name
        )}
        {progress ? (
          <Segments label={progress.label} segments={progress.segments} />
        ) : null}
        <MetaRow className={layout.meta} fit={layout.metaFit}>
          <CodeBadge code={code} size={layout.code} />
          {layout.countInMeta ? (
            <span className={layout.countInMeta}>{count}</span>
          ) : null}
          {facts}
        </MetaRow>
        {footnote}
      </Text>
      {end}
    </Row>
  );
}
