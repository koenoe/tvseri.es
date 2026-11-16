import { episodeCode } from '@tvseri.es/utils';
import {
  completeGlyph,
  onAirGlyph,
  playGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import { formatAirWeekdayDate } from '@/lib/format/airDate';
import type { ControlState } from '@/lib/marking/controlState';
import episodePath from '@/lib/routing/episodePath';

/** The series a marking control is for */
export type MarkShow = Readonly<{
  /** the series page (`showPath`) */
  href: string;
  id: number;
  /** "3 seasons": the tile's own fact, the end of "Finished" (none: the plain form) */
  seasons?: string | null;
  title: string;
}>;

/** A state the one button draws as a link to the series page */
export type LinkState = Extract<
  ControlState,
  { kind: 'finished' | 'up-to-date' | 'watching' }
>;

export type LinkFace = Readonly<{
  /** the second fact, at the button's end; null: the label is centred */
  fact: string | null;
  glyph: Glyph;
  href: string;
  label: string;
}>;

/**
 * The one button for a series the viewer has (what a press
 * does): Continue opens the next episode on the series page, with the
 * season's progress at its end; Up to date and Finished open the series page
 * (nothing is marked), with the next air date or the tile's seasons at the end.
 */
export function linkFace(state: LinkState, show: MarkShow): LinkFace {
  const { href } = show;
  switch (state.kind) {
    case 'watching': {
      const { next, seasonTotal, seasonWatched } = state;
      return {
        fact:
          seasonWatched !== null && seasonTotal
            ? `${seasonWatched} of ${seasonTotal}`
            : null,
        glyph: playGlyph,
        href: next
          ? episodePath(href, next.seasonNumber, next.episodeNumber)
          : href,
        label: next ? `Continue ${episodeCode(next)}` : 'Continue',
      };
    }
    case 'up-to-date':
      return {
        fact: state.nextAirDate
          ? formatAirWeekdayDate(state.nextAirDate)
          : null,
        glyph: onAirGlyph,
        href,
        label: 'Up to date',
      };
    case 'finished':
      return {
        fact: show.seasons || null,
        glyph: completeGlyph,
        href,
        label: 'Finished',
      };
  }
}
