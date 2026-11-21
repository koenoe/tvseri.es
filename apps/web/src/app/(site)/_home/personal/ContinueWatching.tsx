'use client';

import type { UpNextItem } from '@tvseri.es/schemas';
import CrossFade from '@/components/motion/CrossFade';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { userGlyph } from '@/components/ui/icon/glyphs';
import type { UpNextArt } from '@/components/up-next/UpNextItemCard';
import useFinishHold from '@/components/up-next/useFinishHold';
import { useLiveUpNext } from '@/lib/marking/hooks';
import profilePath from '@/lib/routing/profilePath';
import {
  CONTINUE_HEAD,
  CONTINUE_SECTION,
  CONTINUE_TITLE,
  CONTINUE_WATCHING_TITLE,
  continueGrid,
  PROFILE_BUTTON_HEAD,
  PROFILE_BUTTON_PHONE,
  PROFILE_LABEL,
} from './continueLayout';
import InProgressLane from './InProgressLane';
import liveContinue from './liveContinue';
import UpNextTile from './UpNextTile';

/**
 * The tile's cross-fade: the stack is the grid's item now, and each copy a
 * one-cell grid, so the card still stretches to the lane's height
 */
const TILE_FRAME = 'min-w-0';
const TILE_LAYER = 'grid grid-cols-[minmax(0,1fr)]';

type Props = Readonly<{
  /** the first item's show art (backdrop, logo), null when it failed */
  first: UpNextArt | null;
  /** the second item's, for when the first leaves (caught up after a mark) */
  second?: UpNextArt | null;
  /** the viewer's Up next, most recent first (at most 8) */
  items: ReadonlyArray<UpNextItem>;
  /** every show in it, drawn or not */
  count: number;
  /** the clock for "yesterday" and "Next Sun Nov 15" (the server's, or the preview's) */
  now: number;
  username: string;
}>;

/**
 * Continue watching: a
 * one-click resume right under the spotlight. Title + a 36px "Your
 * profile" button, then the Up next tile beside the In progress lane
 * (stacked below 1024; on the phone one lane row and the profile button
 * under it). Rendered only signed in, with at least one show.
 *
 * The items read through the marking core (`useLiveUpNext`): a mark from
 * the ⋯ Remote moves the tile and the lane rows on at once, and a
 * show with nothing aired left leaves the row (the next one takes the tile,
 * as the next load would draw it, cross-fading in; keyed on the show, so
 * the next episode of the same one is a plain update). When your own mark
 * finished the show, it completes first and the next comes a beat later
 * (`useFinishHold`), as on the profile's Up next.
 */
export default function ContinueWatching({
  count: serverCount,
  first,
  items: serverItems,
  now,
  second = null,
  username,
}: Props) {
  const live = useLiveUpNext(serverItems, now);
  // a show your mark finished holds a beat before the next (or the end);
  // meanwhile the row is drawn as it was, the next show still in the lane
  const { finishing, shown: head } = useFinishHold(live[0]);
  if (!head) {
    return null;
  }
  const items = finishing
    ? [head, ...live.filter((item) => item.seriesId !== head.seriesId)]
    : live;
  const art =
    head.seriesId === serverItems[0]?.seriesId
      ? first
      : head.seriesId === serverItems[1]?.seriesId
        ? second
        : null;
  const { count, hasLane } = liveContinue(
    serverCount,
    serverItems.length,
    items.length,
  );
  const profileHref = profilePath(username);
  const grid = continueGrid(hasLane);
  return (
    <section
      aria-labelledby="continue-watching-title"
      className={CONTINUE_SECTION}
      data-slot="continue"
    >
      <div className={CONTINUE_HEAD}>
        <h2 className={CONTINUE_TITLE} id="continue-watching-title">
          {CONTINUE_WATCHING_TITLE}
        </h2>
        <ButtonLink
          className={PROFILE_BUTTON_HEAD}
          href={profileHref}
          icon={userGlyph}
          size="sm"
        >
          {PROFILE_LABEL}
        </ButtonLink>
      </div>
      <div className={grid}>
        <CrossFade
          className={TILE_LAYER}
          frame={TILE_FRAME}
          swapKey={head.seriesId}
        >
          <UpNextTile finishing={finishing} item={head} now={now} show={art} />
        </CrossFade>
        {hasLane ? (
          <InProgressLane
            count={count}
            items={items}
            profileHref={profileHref}
          />
        ) : (
          <ButtonLink
            className={PROFILE_BUTTON_PHONE}
            href={profileHref}
            icon={userGlyph}
            size="sm"
          >
            {PROFILE_LABEL}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}
