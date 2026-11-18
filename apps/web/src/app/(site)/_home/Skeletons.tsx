import type { ToyKind } from '@tvseri.es/utils';
import type { ReactNode } from 'react';
import { GHOST_LOOK, type GhostCaption } from '@/components/ui/row/RowGhosts';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import { SIGNED_IN_ONLY, SIGNED_OUT_ONLY } from '@/components/ui/viewer/reveal';
import cn from '@/lib/cn';

import type { FeatureSlotKind } from './data/home';
import ArchiveGhost from './feature/archive/ArchiveGhost';
import BingeGhost from './feature/binge/BingeGhost';
import DidYouKnowGhost from './feature/didYouKnow/DidYouKnowGhost';
import StillsGhost from './feature/stills/StillsGhost';
import ContinueGhost from './personal/ContinueGhost';
import GetStartedGhost from './personal/GetStartedGhost';
import PickGhost from './pick/PickGhost';
import CountdownGhost from './premieres/CountdownGhost';
import {
  SLIDE_ACTIONS,
  SLIDE_BODY,
  SPOTLIGHT_STAGE,
  SPOTLIGHT_TEXT_FRAME,
} from './spotlight/slideFrame';
import ConnectedByGhost from './toy/connected-by/ConnectedByGhost';
import IfYouLikedGhost from './toy/if-you-liked/IfYouLikedGhost';
import VersusGhost from './toy/versus/VersusGhost';
import WhatsOnGhost from './toy/whats-on/WhatsOnGhost';
import WhereSetGhost from './toy/where-set/WhereSetGhost';

/**
 * Space holders for the sections that stream in (`HomeView`). Each mirrors
 * the component that replaces it: built from that component's own layout
 * (its exported class constants, `layout.ts` modules and static parts), with
 * ghosts (`ghosts.tsx`) where its data lands and its static copy as real
 * text, so the content fills in instead of swapping in, and nothing below
 * moves (measured at 1440 and 390, `e2e/placeholders-home.spec.ts`).
 */

const GHOST = GHOST_LOOK.loading;

/** The spotlight placeholder's lines and buttons, as the slide draws them */
const RANK_BAR = cn('h-3 w-28 rounded-4', GHOST);
const TITLE_BOX = cn(
  'block h-[70px] w-[200px] rounded-8 md:mb-6 md:h-[100px] md:w-[320px]',
  GHOST,
);
const META_BAR = cn('h-3 w-56 rounded-4', GHOST);
const HOOK_BAR = cn('h-3 w-64 rounded-4 md:w-96', GHOST);
const WATCHLIST_PILL = cn('h-[38px] w-28 rounded-full md:h-10', GHOST);
const SEEN_PILL = cn('h-[38px] w-24 rounded-full md:h-10', GHOST);

/**
 * A new viewer (`data-home="new"`, `htmlHints.ts`) has none of the
 * signed-in rows or cards that start from their library: the signed-out
 * placeholder is theirs, the signed-in one is not (`!` beats the pre-paint
 * rule, `reveal.ts`)
 */
const TOY_FOR_NEW_VIEWER = 'contents [html[data-home=new]_&]:contents!';
const NOT_FOR_NEW_VIEWER = 'hidden [html[data-home=new]_&]:hidden!';

/**
 * The spotlight's stage in the page colour (the ground behind it is the
 * page's) with the slide block's ghost where the text stands: the rank line,
 * the title image, the meta row, the hook line and the two buttons, on the
 * slide's own frame (`slideFrame.ts`), so the text lands on its ghosts.
 */
export function SpotlightSkeleton() {
  return (
    <div aria-hidden className={SPOTLIGHT_STAGE} data-placeholder="spotlight">
      <div className={SPOTLIGHT_TEXT_FRAME}>
        <div className="relative mx-auto h-full max-w-page">
          <div className={SLIDE_BODY}>
            <span className="flex h-5 items-center md:mb-[18px]">
              <span className={RANK_BAR} />
            </span>
            <span className={TITLE_BOX} />
            <span className="flex h-5 items-center md:mb-4">
              <span className={META_BAR} />
            </span>
            <span className="flex h-7 items-center md:mb-4">
              <span className={HOOK_BAR} />
            </span>
            <span className={SLIDE_ACTIONS}>
              <span className={WATCHLIST_PILL} />
              <span className={SEEN_PILL} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Each toy's placeholder, frame included: the toys have no title above
 * them (What's on and Connected by carry their label inside, Where are they
 * set? a hidden heading)
 */
const TOY_GHOST: Readonly<Record<ToyKind, () => ReactNode>> = {
  'connected-by': ConnectedByGhost,
  versus: VersusGhost,
  'whats-on': WhatsOnGhost,
  'where-set': WhereSetGhost,
};

/** Today's feature: the kind the slot draws today (`getFeatureSlot`), none when it draws nothing */
export function FeatureSkeleton({
  count = null,
  kind,
}: Readonly<{
  /** the stills or the Countdown's premieres the day draws (`getFeatureSlot`) */
  count?: number | null;
  kind: FeatureSlotKind | null;
}>) {
  if (!kind) {
    return null;
  }
  if (kind === 'countdown') {
    return <CountdownGhost count={count} />;
  }
  // frame included: each block carries its label, no title above
  if (kind === 'binge') {
    return <BingeGhost />;
  }
  if (kind === 'archive') {
    return <ArchiveGhost />;
  }
  if (kind === 'stills') {
    return <StillsGhost count={count} />;
  }
  return <DidYouKnowGhost />;
}

/**
 * Today's toy: the kind of the day is known (`toyKindOfDay`). On "If you
 * liked" days a signed-in viewer's slot is that card instead (the display
 * cookie says who is signed in before the first paint), so both are in the
 * shell and the viewer's is shown. A new viewer (`data-home="new"`, an
 * empty library on this browser) has no show to start that card from, so
 * their slot is the toy's.
 */
export function ToySkeleton({
  ifYouLiked,
  kind,
}: Readonly<{ ifYouLiked: boolean; kind: ToyKind | null }>) {
  const Placeholder = kind ? TOY_GHOST[kind] : null;
  const toy = Placeholder ? <Placeholder /> : null;
  if (!ifYouLiked) {
    return toy;
  }
  const signedOut = { [SIGNED_OUT_ONLY]: '' };
  const signedIn = { [SIGNED_IN_ONLY]: '' };
  return (
    <>
      <div {...signedOut} className={TOY_FOR_NEW_VIEWER}>
        {toy}
      </div>
      <div {...signedIn} className={NOT_FOR_NEW_VIEWER}>
        <IfYouLikedGhost />
      </div>
    </>
  );
}

/** Can't decide? Let us pick: the section's own layout (`pick/PickGhost.tsx`) */
export const PickSkeleton = PickGhost;

/**
 * Continue watching's failed state takes the space its placeholder held
 * (`RowError`'s slots box: the placeholder's panel less the error's own
 * header and the row's rail padding, 24px; Get started's for a new viewer), so a failure moves
 * nothing below it (`e2e/home-continue.spec.ts` measures it)
 */
export const CONTINUE_RESERVE =
  'min-h-[518px] md:min-h-[842px] lg:min-h-[420px]';

/**
 * Continue watching: held for a signed-in viewer (shown before the first
 * paint, `viewerHintsScript`), nothing for everyone else; the section's own
 * layout with ghosts where its data lands (`personal/ContinueGhost.tsx`). A
 * new viewer (an empty library on this browser, `data-home="new"`,
 * `htmlHints.ts`) gets Get started instead.
 */
export function ContinueSkeleton() {
  return (
    <>
      <div className="hidden [html[data-home=member]_&]:block">
        <ContinueGhost />
      </div>
      <div className="hidden [html[data-home=new]_&]:block">
        <GetStartedGhost />
      </div>
    </>
  );
}

/** The signed-in rows' line under each tile; their error keeps it too (`GuardedSection`) */
export const SIGNED_IN_ROW_CAPTION = 'meta' satisfies GhostCaption;

/**
 * A signed-in viewer's row (Because you watched, More {genre}): its space is
 * held for them (shown before the first paint, `viewerHintsScript`), nothing for
 * everyone else. A new viewer (`data-home="new"`, an empty library on this
 * browser) has no such rows, so they hold nothing either: the page is the
 * height it ends at. The title comes with the data, so it is a bar; the caption
 * is the one meta line the loaded tile draws.
 */
function SignedInRowSkeleton({
  id,
  tiles,
}: Readonly<{ id: string; tiles?: 'backdrop' }>) {
  const signedIn = { [SIGNED_IN_ONLY]: '' };
  return (
    <div {...signedIn} className={NOT_FOR_NEW_VIEWER}>
      <RowSkeleton
        caption={SIGNED_IN_ROW_CAPTION}
        id={id}
        look="home"
        name={id}
        tiles={tiles}
        title="Loading"
        titleGhost
      />
    </div>
  );
}

export const BecauseYouWatchedSkeleton = () => (
  <SignedInRowSkeleton id="because-you-watched" />
);

export const MoreGenreSkeleton = () => (
  <SignedInRowSkeleton id="more-genre" tiles="backdrop" />
);
