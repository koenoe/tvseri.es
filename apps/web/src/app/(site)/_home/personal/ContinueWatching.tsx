'use client';

import type { UpNextItem } from '@tvseri.es/schemas';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { userGlyph } from '@/components/ui/icon/glyphs';
import type { UpNextArt } from '@/components/up-next/UpNextItemCard';
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
import UpNextTile from './UpNextTile';

type Props = Readonly<{
  /** the first item's show art (backdrop, logo), null when it failed */
  first: UpNextArt | null;
  /** the second item's, for when the first leaves (caught up after a mark) */
  second?: UpNextArt | null;
  /** the viewer's Up next, most recent first (at most 8) */
  items: ReadonlyArray<UpNextItem>;
  /** the clock for "yesterday" and "Next Sun 15 Nov" (the server's, or the preview's) */
  now: number;
  username: string;
}>;

/**
 * Continue watching (phone 2): a
 * one-click resume right under the spotlight. Title + a 36px "Your
 * profile" button, then the Up next tile beside the In progress lane
 * (stacked below 1024; on the phone one lane row and the profile button
 * under it). Rendered only signed in, with at least one show.
 *
 * The items read through the marking core (`useLiveUpNext`): a mark from
 * the eye or the Remote moves the tile and the lane rows on at once, and a
 * show with nothing aired left leaves the row (the next one takes the tile,
 * as the next load would draw it).
 */
export default function ContinueWatching({
  first,
  items: serverItems,
  now,
  second = null,
  username,
}: Props) {
  const items = useLiveUpNext(serverItems);
  const [head] = items;
  if (!head) {
    return null;
  }
  const art =
    head.seriesId === serverItems[0]?.seriesId
      ? first
      : head.seriesId === serverItems[1]?.seriesId
        ? second
        : null;
  const profileHref = profilePath(username);
  const hasLane = items.length > 1;
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
        <UpNextTile item={head} now={now} show={art} />
        {hasLane ? (
          <InProgressLane items={items} profileHref={profileHref} />
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
