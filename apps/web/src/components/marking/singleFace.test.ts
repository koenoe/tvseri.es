import { describe, expect, it } from 'vitest';

import {
  completeGlyph,
  onAirGlyph,
  playGlyph,
} from '@/components/ui/icon/glyphs';

import { linkFace } from './singleFace';

const SHOW = {
  href: '/7/the-pitt',
  id: 7,
  seasons: '3 seasons',
  title: 'The Pitt',
};

describe('linkFace: the one button for a series the viewer has', () => {
  it('Continue: the code, the season’s count, the episode on the series page', () => {
    expect(
      linkFace(
        {
          kind: 'watching',
          next: { episodeNumber: 4, seasonNumber: 2 },
          onWatchlist: false,
          seasonTotal: 15,
          seasonWatched: 3,
        },
        SHOW,
      ),
    ).toEqual({
      fact: '3 of 15',
      glyph: playGlyph,
      href: '/7/the-pitt?season=2&episode=4',
      label: 'Continue S02E04',
    });
  });

  it('Continue without the show’s facts: no code, no count, the series page', () => {
    expect(
      linkFace(
        {
          kind: 'watching',
          next: null,
          onWatchlist: false,
          seasonTotal: null,
          seasonWatched: null,
        },
        SHOW,
      ),
    ).toEqual({
      fact: null,
      glyph: playGlyph,
      href: '/7/the-pitt',
      label: 'Continue',
    });
  });

  it('Up to date: the next air date, or the plain form without one', () => {
    expect(
      linkFace(
        { kind: 'up-to-date', nextAirDate: '2026-11-19', onWatchlist: false },
        SHOW,
      ),
    ).toEqual({
      fact: 'Thu Nov 19',
      glyph: onAirGlyph,
      href: '/7/the-pitt',
      label: 'Up to date',
    });
    expect(
      linkFace(
        { kind: 'up-to-date', nextAirDate: null, onWatchlist: false },
        SHOW,
      ).fact,
    ).toBeNull();
  });

  it('Finished: the tile’s seasons, or the plain form without them', () => {
    expect(linkFace({ kind: 'finished', onWatchlist: false }, SHOW)).toEqual({
      fact: '3 seasons',
      glyph: completeGlyph,
      href: '/7/the-pitt',
      label: 'Finished',
    });
    expect(
      linkFace(
        { kind: 'finished', onWatchlist: false },
        { ...SHOW, seasons: null },
      ).fact,
    ).toBeNull();
  });
});
