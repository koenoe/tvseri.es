import type { ReactNode } from 'react';
import {
  didNotLoad,
  REST_IS_FINE,
} from '@/components/ui/error/unavailableCopy';
import FailedCard, { TryAgain } from '@/components/ui/failed/FailedCard';
import { showGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import RefreshRetry from './RefreshRetry';
import RowFrame from './RowFrame';
import RowGhosts, { type GhostCaption } from './RowGhosts';
import RowHeader, { type RowHeading } from './RowHeader';
import { ROW_FAILED, ROW_TRY_AGAIN } from './rowFailedLook';
import {
  ROW_INSET,
  type RowInset,
  type RowLook,
  type RowTiles,
} from './rowLayout';

type State =
  | Readonly<{ onRetry?: () => void; state: 'failed' }>
  | Readonly<{ onRetry?: undefined; state: 'retrying' }>
  /**
   * The data is `Unavailable` in a cached server section: the failed look,
   * settled, with a Try again that refreshes the route (`RefreshRetry`). The
   * failure is kept only for the short `unavailable` life, after which the
   * page is made again.
   */
  | Readonly<{ onRetry?: undefined; state: 'unavailable' }>;

type Props = Omit<RowHeading, 'count' | 'seeAllHref'> &
  Readonly<{
    /** the lines under each tile, as the row's skeleton draws them (same height) */
    caption?: GhostCaption;
    id: string;
    inset?: RowInset;
    look?: RowLook;
    /**
     * A min-height class for the slots' box when the section is not a row of
     * tiles (a lane, a card): the failed state then takes the space its
     * placeholder held, and the card centres in it
     */
    reserve?: string;
    /** the row's switch, beside the title on desktop, so the failed row keeps it */
    switcher?: ReactNode;
    tiles?: RowTiles;
  }> &
  State;

/**
 * The room the card has (over the slots, 12px in; 32 from the left from md),
 * as a container: the card lies in a row (mark, text, Try again; 24px
 * padding) where that room is 560px or more, and stacks across it where it
 * isn't (a phone, a half-width Stats block at 800, where the row ran past
 * the page). Its width hugs the row, never past the room.
 */
const CARD_ROOM =
  'absolute top-1/2 right-[calc(var(--row-end)+12px)] left-[calc(var(--row-start)+12px)] -translate-y-1/2 @container md:left-[calc(var(--row-start)+32px)]';

/**
 * What a row shows when its data failed: the
 * header stays, dashed slots keep the row's space, and one card says only
 * this row failed, with Try again. While it retries the slots pulse and the
 * card says so. Use it through RowErrorBoundary; render it directly only to
 * show it (style guide) or, `state="unavailable"`, for a cached section
 * whose data is `Unavailable`.
 */
export default function RowError({
  caption,
  id,
  inset = 'page',
  look,
  onRetry,
  reserve,
  state,
  switcher,
  tiles = 'poster',
  ...heading
}: Props) {
  const titleId = `${id}-title`;
  const card =
    state === 'failed' ? (
      <RowErrorCard onRetry={onRetry} state={state} title={heading.title} />
    ) : (
      <RowErrorCard state={state} title={heading.title} />
    );
  return (
    <RowFrame
      aria-busy={state === 'retrying'}
      inset={inset}
      look={look}
      tiles={tiles}
      titleId={titleId}
    >
      <RowHeader {...heading} switcher={switcher} titleId={titleId} />
      {/*
        the slots start where the row's cards did (its look's rail offset,
        as Row and RowSkeleton), not 28/16: a row that fails after
        its skeleton was on screen then moves nothing below it
      */}
      <div className="relative pt-[var(--row-rail-pt,24px)] pb-6">
        <div className={cn('relative', reserve)}>
          <RowGhosts
            caption={caption}
            look={state === 'retrying' ? 'retrying' : 'failed'}
          />
          {card}
        </div>
      </div>
    </RowFrame>
  );
}

/**
 * A section that isn't a tile row, failed ("Per-section
 * error": the header stays, the slots keep the space, one card says only
 * this section failed): its own placeholder, settled (no pulse) and out of
 * the accessibility tree, under the card. A read that fails after the
 * placeholder was on screen (a 10 s timeout) then moves nothing below it,
 * and a hero fails as a hero, not as a row of tiles. While it retries the
 * placeholder pulses again.
 */
export function SectionError({
  inset = 'page',
  placeholder,
  title,
  ...state
}: Readonly<{
  /** where the section sits (the card's left edge follows `--row-start`) */
  inset?: RowInset;
  placeholder: ReactNode;
  title: string;
}> &
  State) {
  const card =
    state.state === 'failed' ? (
      <RowErrorCard onRetry={state.onRetry} state="failed" title={title} />
    ) : (
      <RowErrorCard state={state.state} title={title} />
    );
  return (
    <div className="@container">
      <div
        className={cn(
          'relative',
          ROW_INSET[inset],
          state.state !== 'retrying' && '[&_*]:animate-none',
        )}
      >
        <div aria-hidden inert>
          {placeholder}
        </div>
        {card}
      </div>
    </div>
  );
}

/**
 * The card over the slots, on its own for a section that isn't a row (its
 * box sets `--row-start` / `--row-end`, 0 when it has no row inset). `title`
 * is the section's title.
 */
export function RowErrorCard(props: Readonly<{ title: string }> & State) {
  return (
    <div className={CARD_ROOM}>
      <CardBody {...props} />
    </div>
  );
}

/** the show glyph in the round mark */
const showMark = (
  <ErrorMark>
    <Icon glyph={showGlyph} size={24} />
  </ErrorMark>
);

function CardBody({
  onRetry,
  state,
  title,
}: Readonly<{ title: string }> & State) {
  if (state === 'retrying') {
    return (
      <FailedCard
        action={<TryAgain look={ROW_TRY_AGAIN} pending />}
        body="Only this row reloads."
        look={ROW_FAILED}
        mark={showMark}
        role="alert"
        title={didNotLoad(title)}
      />
    );
  }
  if (state === 'unavailable') {
    // in the prerendered page from the start: read in order, not announced
    return (
      <FailedCard
        action={<RefreshRetry />}
        body={REST_IS_FINE}
        look={ROW_FAILED}
        mark={showMark}
        title={didNotLoad(title)}
      />
    );
  }
  return (
    <FailedCard
      action={<TryAgain look={ROW_TRY_AGAIN} onClick={onRetry} />}
      body={REST_IS_FINE}
      look={ROW_FAILED}
      mark={showMark}
      role="alert"
      title={didNotLoad(title)}
    />
  );
}

/** the 48px round mark before the text; a stacked card drops it */
function ErrorMark({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-white/6 text-white/80 @min-[560px]:inline-flex">
      {children}
    </span>
  );
}
