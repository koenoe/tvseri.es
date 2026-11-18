import type { Season } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { seriesSeasons, statusFact, statusLabel } from './status';

describe('statusLabel', () => {
  it('words the TMDB statuses, the same on every page', () => {
    expect(statusLabel({ status: 'Returning Series' })).toBe('Returning');
    expect(statusLabel({ renewedSeason: 2, status: 'Returning Series' })).toBe(
      'S02 renewed',
    );
    expect(statusLabel({ status: 'Ended' })).toBe('Ended');
    expect(statusLabel({ status: 'Canceled' })).toBe('Cancelled');
    for (const status of ['Planned', 'Pilot', 'In Production']) {
      expect(statusLabel({ status })).toBe('In production');
    }
  });

  it('is Returning when TMDB lists no season to come', () => {
    expect(
      statusLabel({ renewedSeason: null, status: 'Returning Series' }),
    ).toBe('Returning');
  });

  it('shows an unknown status as TMDB has it', () => {
    expect(statusLabel({ status: 'Something New' })).toBe('Something New');
  });
});

describe('statusFact', () => {
  it('pairs the words with ended or ongoing', () => {
    expect(statusFact({ status: 'Ended' })).toEqual({
      kind: 'ended',
      text: 'Ended',
    });
    expect(statusFact({ status: 'Canceled' })).toEqual({
      kind: 'ended',
      text: 'Cancelled',
    });
    expect(
      statusFact({ renewedSeason: 3, status: 'Returning Series' }),
    ).toEqual({ kind: 'ongoing', text: 'S03 renewed' });
    expect(statusFact({ status: 'Planned' })).toEqual({
      kind: 'ongoing',
      text: 'In production',
    });
  });

  it('is null without a status', () => {
    expect(statusFact({ status: '' })).toBeNull();
  });

  it('reads a status it has no words for as ended, as the series years do', () => {
    expect(statusFact({ status: 'Rumoured' })).toEqual({
      kind: 'ended',
      text: 'Rumoured',
    });
  });
});

const season = (seasonNumber: number, aired: number, hasAired = aired > 0) =>
  ({
    hasAired,
    numberOfAiredEpisodes: aired,
    seasonNumber,
  }) as Season;

describe('seriesSeasons', () => {
  it('counts aired seasons and names a listed unaired one', () => {
    const series = {
      numberOfSeasons: 2,
      seasons: [season(1, 8), season(2, 0)],
      status: 'Returning Series' as const,
    };
    expect(seriesSeasons(series)).toEqual({
      airedSeasons: 1,
      renewedSeason: 2,
    });
    expect(statusLabel({ ...series, ...seriesSeasons(series) })).toBe(
      'S02 renewed',
    );
  });

  it('is two seasons and Returning with nothing listed after them', () => {
    const series = {
      numberOfSeasons: 2,
      seasons: [season(1, 8), season(2, 8)],
      status: 'Returning Series' as const,
    };
    expect(statusLabel({ ...series, ...seriesSeasons(series) })).toBe(
      'Returning',
    );
  });

  it('counts a season whose premiere date has passed as started', () => {
    expect(
      seriesSeasons({
        numberOfSeasons: 2,
        seasons: [season(1, 8), season(2, 0, true)],
        status: 'Returning Series',
      }),
    ).toEqual({ airedSeasons: 2, renewedSeason: null });
  });

  it("falls back to TMDB's count, with no renewal, without the seasons", () => {
    expect(
      seriesSeasons({ numberOfSeasons: 3, status: 'Returning Series' }),
    ).toEqual({ airedSeasons: 3, renewedSeason: null });
  });
});
