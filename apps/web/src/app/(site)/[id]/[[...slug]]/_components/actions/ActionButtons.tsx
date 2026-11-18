'use client';

import { type MouseEvent, memo, useCallback, useMemo } from 'react';

import ShowRemote from '@/components/remote/ShowRemote';
import type {
  NextToAir,
  RemoteEpisode,
  RemoteSection,
} from '@/components/remote/types';
import CircleButton from '@/components/ui/button/CircleButton';
import {
  bookmarkGlyph,
  externalGlyph,
  eyeGlyph,
  heartGlyph,
  pencilGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import { useSeriesAnswer } from '@/lib/marking/hooks';
import { pressMark, scopeKey } from '@/lib/marking/pressGate';
import { seriesProgress } from '@/lib/marking/progress';
import { useListToggle } from '@/lib/marking/toggles';
import type { SeriesBase } from '@/lib/marking/types';
import useMarking from '@/lib/marking/useMarking';
import showPath from '@/lib/routing/showPath';
import { openHistory } from '../../_lib/urlState';
import {
  UNAVAILABLE_REASON,
  useViewerUnavailable,
} from '../../_lib/viewerUnavailable';
import {
  openAdminImages,
  tmdbImagesUrl,
  useAdminImagesKey,
  wantImages,
} from '../admin/openAdminImages';

type Props = Readonly<{
  episodes: ReadonlyArray<RemoteEpisode>;
  hasAired: boolean;
  isAdmin: boolean;
  nextToAir: NextToAir | null;
  seriesId: number;
  slug: string;
  title: string;
}>;

/**
 * The hero circles: 22px icons in white/75 on desktop (ep-circ.ep-lg),
 * 40px circles with 20px icons on phones (production's size-10 / size-5).
 * `[&_svg]`, not `[&>svg]`: a toggle wraps its icon in a span.
 */
const PHONE_CIRCLE =
  'text-white/75 md:[&>svg]:size-[22px] max-md:size-10 max-md:[&_svg]:size-5 disabled:cursor-default disabled:hover:border-white/20';

/** Every aired episode watched: the eye is pressed (and unmarks the show). */
const isCompleteView = (view: SeriesBase | undefined) =>
  view ? seriesProgress(view).isComplete : false;

/** Production's WatchButton eye: the filled drawing at rest too. */
const watchEyeGlyph: Glyph = { outline: eyeGlyph.filled };

/** The Remote's Admin row: Hero images (I), Images on TMDB (T). */
function useAdminSection(
  seriesId: number,
  isAdmin: boolean,
): RemoteSection | undefined {
  const imagesKey = useAdminImagesKey(seriesId);
  return useMemo(
    () =>
      isAdmin
        ? {
            keys: [
              {
                icon: pencilGlyph,
                id: 'hero-images',
                label: 'Hero images',
                letter: 'I',
                onSelect: () => openAdminImages(seriesId),
                ...imagesKey,
              },
              {
                external: true,
                href: tmdbImagesUrl(seriesId),
                icon: externalGlyph,
                id: 'tmdb-images',
                label: 'Images on TMDB',
                letter: 'T',
              },
            ],
            note: 'Only you see these',
            onShow: () => wantImages(seriesId),
            title: 'Admin',
          }
        : undefined,
    [imagesKey, isAdmin, seriesId],
  );
}

/**
 * The hero's actions (ep0-btns): the eye marks or unmarks the
 * whole show, the heart and bookmark toggle the lists, "…" opens the Remote.
 * All optimistic through the marking core; signed out, the core asks to sign
 * in.
 */
function ActionButtons({
  episodes,
  hasAired,
  isAdmin,
  nextToAir,
  seriesId,
  slug,
  title,
}: Props) {
  const marking = useMarking();
  // a boolean, so marking an episode re-renders the buttons only when it flips
  const isComplete = useSeriesAnswer(seriesId, isCompleteView);
  const favorites = useListToggle(seriesId, 'favorites');
  const watchlist = useListToggle(seriesId, 'watchlist');
  const extraSection = useAdminSection(seriesId, isAdmin);
  const toggleShow = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      pressMark(scopeKey(seriesId), event, () => marking.toggleScope(seriesId));
    },
    [marking, seriesId],
  );
  const historyHref = `${showPath(seriesId, slug)}?history`;
  // Off, with the reason as the name: the viewer's marks didn't
  // load (nothing may toggle against a guessed state), or nothing has aired.
  const unavailable = useViewerUnavailable(seriesId);
  const eyeOff = unavailable
    ? UNAVAILABLE_REASON
    : hasAired
      ? null
      : 'Not aired yet';
  const eyeLabel =
    eyeOff ??
    (isComplete
      ? 'Unmark the whole series'
      : 'Mark the whole series (just now)');
  const listLabel = (name: string) =>
    unavailable ? `${name}: ${UNAVAILABLE_REASON.toLowerCase()}` : name;
  const eyeDisabled = eyeOff !== null;
  const favouriteLabel = listLabel('Favourite');
  const watchlistLabel = listLabel('Watchlist');
  return (
    <div className="flex gap-2 md:gap-3" data-slot="actions">
      <CircleButton
        className={PHONE_CIRCLE}
        disabled={eyeDisabled}
        icon={watchEyeGlyph}
        label={eyeLabel}
        onClick={toggleShow}
        pressed={isComplete}
        size={48}
      />
      <CircleButton
        className={PHONE_CIRCLE}
        disabled={unavailable}
        icon={heartGlyph}
        label={favouriteLabel}
        onClick={favorites.toggle}
        pressed={favorites.isOn}
        size={48}
      />
      <CircleButton
        className={PHONE_CIRCLE}
        disabled={unavailable}
        icon={bookmarkGlyph}
        label={watchlistLabel}
        onClick={watchlist.toggle}
        pressed={watchlist.isOn}
        size={48}
      />
      <ShowRemote
        className={PHONE_CIRCLE}
        episodes={episodes}
        extraSection={extraSection}
        hasAired={hasAired}
        historyHref={historyHref}
        nextToAir={nextToAir}
        onEditHistory={openHistory}
        seriesId={seriesId}
        seriesName={title}
        size={48}
      />
    </div>
  );
}

ActionButtons.displayName = 'ActionButtons';

export default memo(ActionButtons);

/** One action's space: a flat ghost disc, no ring (not a control yet). */
const CIRCLE_GHOST = `size-10 rounded-full md:size-12 ${GHOST_FILL}`;

/** Four circles' space while the viewer's state loads, one pulsing layer. */
export function ActionButtonsSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex animate-ghost gap-2 md:gap-3"
      data-placeholder="actions"
    >
      <span className={CIRCLE_GHOST} />
      <span className={CIRCLE_GHOST} />
      <span className={CIRCLE_GHOST} />
      <span className={CIRCLE_GHOST} />
    </div>
  );
}
