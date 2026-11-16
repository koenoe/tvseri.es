'use client';

import type { CSSProperties } from 'react';
import { createFakeMarking } from '@/components/remote/fakeMarking';
import { RemoteMarkingProvider } from '@/components/remote/marking';
import ShowRemote from '@/components/remote/ShowRemote';
import TileRemote from '@/components/remote/TileRemote';
import type { RemoteEpisode, RemoteSection } from '@/components/remote/types';
import severance from '@/components/ui/error/stills/severance.webp';
import stranger from '@/components/ui/error/stills/stranger.webp';

/**
 * The design's frames for the Remote, with in-memory fakes (no store, no
 * actions): The Bear's show header (672 × 460, the ⋯ at 196, 152), Severance
 * finished, and The Bear's In progress tile (448 × 440). Stills are bundled
 * stand-ins (design images are not in the repo).
 */

let slow = false;
export const setSlow = (value: boolean) => {
  slow = value;
};
const delayMs = () => (slow ? 900 : 0);

const BEAR_S3 = [
  'Tomorrow',
  'Next',
  'Doors',
  'Violet',
  'Children',
  'Napkins',
  'Legacy',
  'Ice Chips',
  'Apologies',
  'Forever',
];
const STILLS = [stranger.src, severance.src];
const BEAR_EPISODES: ReadonlyArray<RemoteEpisode> = BEAR_S3.map(
  (title, index) => ({
    episodeNumber: index + 1,
    seasonNumber: 3,
    still: STILLS[index % 2] ?? null,
    title,
  }),
);

const e = (episodeNumber: number) => ({ episodeNumber, seasonNumber: 3 });
const list = (isFavorited: boolean, isWatchlisted: boolean) => ({
  isFavorited,
  isWatchlisted,
});

export const FAKES = {
  after: createFakeMarking({
    delayMs,
    lastEpisode: 10,
    nextEpisode: e(6),
    status: list(true, false),
  }),
  finished: createFakeMarking({
    delayMs,
    lastEpisode: 10,
    nextEpisode: null,
    status: list(false, false),
  }),
  keyboard: createFakeMarking({
    delayMs,
    lastEpisode: 10,
    nextEpisode: e(5),
    status: list(false, true),
  }),
  open: createFakeMarking({
    delayMs,
    lastEpisode: 10,
    nextEpisode: e(5),
    status: list(false, false),
  }),
  phone: createFakeMarking({
    delayMs,
    lastEpisode: 10,
    nextEpisode: e(5),
    status: list(false, false),
  }),
  tile: createFakeMarking({
    delayMs,
    lastEpisode: 10,
    nextEpisode: e(5),
    status: null,
  }),
} as const;

export type FakeName = keyof typeof FAKES;

const inkOf = (ink: string) =>
  ({ '--main-background-color': ink }) as CSSProperties;

/** A show header frame on the page colour `ink` (the Remote itself stays neutral). */
export function ShowFrame({
  extraSection,
  fake,
  ink = '#29251f',
  name,
  seriesName = 'The Bear',
}: Readonly<{
  extraSection?: RemoteSection;
  fake: FakeName;
  ink?: string;
  name: string;
  seriesName?: string;
}>) {
  const style = inkOf(ink);
  const finished = fake === 'finished';
  const nextToAir = finished
    ? { airDate: null, episodeNumber: 1, seasonNumber: 3 }
    : null;
  return (
    <div
      className="relative h-115 w-168 max-w-full overflow-hidden rounded-16 bg-[var(--main-background-color)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
      data-frame={name}
      style={style}
    >
      <p className="absolute top-10 left-10 font-display text-display">
        {seriesName}
      </p>
      <div className="absolute top-38 left-49">
        <RemoteMarkingProvider value={FAKES[fake]}>
          <ShowRemote
            episodes={BEAR_EPISODES}
            extraSection={extraSection}
            hasAired
            historyHref="#history"
            nextToAir={nextToAir}
            seriesId={136315}
            seriesName={seriesName}
            size={40}
          />
        </RemoteMarkingProvider>
      </div>
    </div>
  );
}

/** The In progress tile frame: the ⋯ 16px from the top right corner. */
export function TileFrame({ name }: Readonly<{ name: string }>) {
  const style = inkOf('#29251f');
  return (
    <div
      className="relative h-110 w-112 max-w-full overflow-hidden rounded-16 bg-[var(--main-background-color)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
      data-frame={name}
      style={style}
    >
      <p className="absolute bottom-6 left-6 text-title-2">The Bear</p>
      <div className="absolute top-4 right-4">
        <RemoteMarkingProvider value={FAKES.tile}>
          <TileRemote
            episodes={BEAR_EPISODES}
            historyHref="#history"
            ink="#29251f"
            seriesId={136315}
            seriesName="The Bear"
          />
        </RemoteMarkingProvider>
      </div>
    </div>
  );
}
