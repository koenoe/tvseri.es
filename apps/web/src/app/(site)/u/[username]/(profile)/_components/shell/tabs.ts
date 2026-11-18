import {
  historyGlyph,
  overviewGlyph,
  showGlyph,
  statsGlyph,
  usersGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import type { ProfileSegment } from '@/lib/routing/profilePath';

/**
 * Desktop: pills in a row, the 16px icon beside the label. Phone: five
 * equal 50px-tall columns, the icon above a 12/16 label, so every tab fits
 * a 390 screen without scrolling.
 */
export const TAB =
  'flex items-center justify-center whitespace-nowrap font-medium transition-colors md:shrink-0 md:gap-2 md:rounded-8 md:px-4 md:py-1.5 md:text-body-sm max-md:h-[50px] max-md:min-w-0 max-md:flex-1 max-md:basis-0 max-md:flex-col max-md:gap-0.5 max-md:rounded-10 max-md:text-[12px] max-md:leading-4';

export type ProfileTab = Readonly<{
  label: string;
  glyph: Glyph | ToggleGlyph;
  /** Path under `/u/{username}` ('' = the overview); Stats links to a year */
  segment: ProfileSegment | 'stats';
}>;

/** The tab bar: Overview · Library · History · Circle · Stats */
export const PROFILE_TABS: ReadonlyArray<ProfileTab> = [
  { glyph: overviewGlyph, label: 'Overview', segment: '' },
  { glyph: showGlyph, label: 'Library', segment: 'library' },
  { glyph: historyGlyph, label: 'History', segment: 'history' },
  { glyph: usersGlyph, label: 'Circle', segment: 'circle' },
  { glyph: statsGlyph, label: 'Stats', segment: 'stats' },
];

/** What the profile owner has; `null` when the read failed (the tab stays) */
type TabFacts = Readonly<{
  followers: number | null;
  following: number | null;
  /** Any stored episode, undated included (`hasStatsFromEpisodes`) */
  hasStats: boolean | null;
}>;

/**
 * The tabs a profile shows, never a link to an empty page (no dead
 * ends): Circle goes while the owner follows nobody and nobody follows
 * them, Stats while they have no episode at all. On day 0 that is
 * Overview · Library · History. A count that didn't load keeps its tab.
 */
export function visibleTabs({
  followers,
  following,
  hasStats,
}: TabFacts): ReadonlyArray<ProfileTab> {
  return PROFILE_TABS.filter((tab) => {
    if (tab.segment === 'circle') {
      return followers !== 0 || following !== 0;
    }
    if (tab.segment === 'stats') {
      return hasStats !== false;
    }
    return true;
  });
}

/**
 * Whether Stats has something to show, from the stored episode count (the
 * counts the tab bar reads anyway; regular episodes, undated included): a
 * user with only undated episodes gets a Stats tab that opens on an empty
 * year (rare). `null`: the count is unknown, the tab stays.
 */
export const hasStatsFromEpisodes = (
  episodes: number | null,
): boolean | null => (episodes === null ? null : episodes > 0);
