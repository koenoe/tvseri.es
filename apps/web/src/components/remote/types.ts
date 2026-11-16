import type { EpisodeRef } from '@tvseri.es/schemas';

import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import type { ListStatus } from '@/lib/marking/types';

export type { EpisodeRef, ListStatus };

export type MarkingList = 'favorites' | 'watchlist';

/**
 * What the big key shows for an episode: its title and still. Pages pass the
 * episodes they already have (the next-up season); ~120 bytes each.
 */
export type RemoteEpisode = EpisodeRef &
  Readonly<{
    /** The TMDB still URL (`Episode.stillImage`), or null for none. */
    still: string | null;
    title: string;
  }>;

/**
 * The next episode to air (`TvSeries.nextEpisodeToAir`, or an announced
 * season without a date): the reason under a disabled big key.
 */
export type NextToAir = Readonly<{
  /** `YYYY-MM-DD`, or null when it has no date yet. */
  airDate: string | null;
  episodeNumber: number;
  seasonNumber: number;
}>;

/**
 * One small key, as the Remote draws its own and the extra section's (the
 * show page's Admin row). A link (`href`, `external` opens a new tab) or a
 * button (`onSelect`); `letter` is the chip and `aria-keyshortcuts` and runs
 * the key while the Remote is open; `meta` is the reason under the label
 * (“1 backdrop, no logos: nothing to choose”).
 */
export type RemoteKey = Readonly<{
  disabled?: boolean;
  external?: boolean;
  href?: string;
  icon: Glyph | ToggleGlyph;
  id: string;
  label: string;
  letter: string;
  meta?: string;
  onSelect?: () => void;
}>;

/** A titled group after a rule (“Admin · Only you see these”). */
export type RemoteSection = Readonly<{
  keys: ReadonlyArray<RemoteKey>;
  note?: string;
  /** Runs when the section is shown (the Remote opened): load what its keys need */
  onShow?: () => void;
  title: string;
}>;
