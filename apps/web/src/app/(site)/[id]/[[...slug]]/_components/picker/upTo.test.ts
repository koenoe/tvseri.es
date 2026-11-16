import { describe, expect, it } from 'vitest';

import type { SeriesBase } from '@/lib/marking/types';

import { upToGo, upToHint, upToPlan } from './upTo';

const at = { runtime: 30, watchedAt: 1 };

const view = (overrides: Partial<SeriesBase> = {}): SeriesBase => ({
  prefs: null,
  seasons: [
    { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 0 },
    { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
    { airedEpisodeCount: 10, episodeCount: 10, seasonNumber: 3 },
  ],
  seriesId: 1,
  skipped: ['S03E02'],
  status: null,
  watched: { S01E01: at, S03E01: at, S03E07: at, S03E09: at },
  ...overrides,
});

const target = { episodeNumber: 5, seasonNumber: 3 };

describe('upToPlan', () => {
  it('marks the open ones up to the target (skipped too) and unmarks later ones of its season', () => {
    const plan = upToPlan(view(), target);
    expect(plan.mark.map((ref) => ref.episodeNumber)).toEqual([
      2, 3, 2, 3, 4, 5,
    ]);
    expect(plan.unmark).toEqual([
      { episodeNumber: 7, seasonNumber: 3 },
      { episodeNumber: 9, seasonNumber: 3 },
    ]);
  });
});

describe('upToHint', () => {
  it('names the target and both ranges', () => {
    const plan = upToPlan(
      view({
        watched: { S01E01: at, S01E02: at, S01E03: at, S03E01: at, S03E07: at },
      }),
      target,
    );
    expect(upToHint(target, 'Children', plan)).toBe(
      'Up to S03E05 Children · marks 4 (S03E02–S03E05) · unmarks 1 (S03E07)',
    );
  });

  it('asks for a target first', () => {
    expect(upToHint(null, undefined, { mark: [], unmark: [] })).toBe(
      'Pick the last episode you saw.',
    );
  });

  it('says when there is nothing new', () => {
    expect(
      upToHint(target, undefined, {
        mark: [],
        unmark: [{ episodeNumber: 7, seasonNumber: 3 }],
      }),
    ).toBe('Up to S03E05 · nothing new to mark · unmarks 1 (S03E07)');
  });
});

describe('upToGo', () => {
  const one = [{ episodeNumber: 7, seasonNumber: 3 }];

  it('labels the primary button per kind', () => {
    expect(upToGo(target, { mark: one, unmark: [] }, 'now')).toEqual({
      disabled: false,
      label: 'Mark 1 episode · just now',
    });
    expect(
      upToGo(target, { mark: [...one, ...one], unmark: [] }, 'unknown').label,
    ).toBe('Mark 2 episodes · I don’t remember when');
    expect(upToGo(target, { mark: [], unmark: one }, 'release').label).toBe(
      'Unmark 1',
    );
  });

  it('is disabled without a target or a change', () => {
    expect(upToGo(null, { mark: [], unmark: [] }, 'now')).toEqual({
      disabled: true,
      label: 'Pick an episode',
    });
    expect(upToGo(target, { mark: [], unmark: [] }, 'now')).toEqual({
      disabled: true,
      label: 'Nothing to change',
    });
  });
});
