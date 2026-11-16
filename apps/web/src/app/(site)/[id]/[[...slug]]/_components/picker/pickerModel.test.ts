import { describe, expect, it } from 'vitest';

import { WHOLE_SHOW } from '@/lib/marking/copy';
import type { SeriesBase } from '@/lib/marking/types';

import { pickerModel } from './pickerModel';

// Tue 10 Nov 2026, 21:40 local
const now = new Date(2026, 10, 10, 21, 40).getTime();

const view = (overrides: Partial<SeriesBase> = {}): SeriesBase => ({
  prefs: null,
  seasons: [{ airedEpisodeCount: 10, episodeCount: 10, seasonNumber: 2 }],
  seriesId: 1,
  skipped: [],
  status: null,
  watched: {},
  ...overrides,
});

const e5 = { episodeNumber: 5, seasonNumber: 2 };
const episode = { airDate: '2023-06-22', title: 'Pop' };

const one = (v: SeriesBase) =>
  pickerModel({
    episode,
    now,
    request: { kind: 'one', refs: [e5], seriesId: 1, what: 'S02E05 Pop' },
    showTitle: 'The Bear',
    view: v,
  });

describe('pickerModel: one episode', () => {
  it('titles it and says it is not watched yet', () => {
    const model = one(view());
    expect(model.title).toBe('When did you watch E05?');
    expect(model.subtitle).toBe('S02E05 · Pop · Not watched yet');
    expect(model.selected).toBeNull();
    expect(model.alt.map((option) => option.label)).toEqual([
      'I don’t remember',
      'Skipped',
    ]);
  });

  it('dates each quick answer', () => {
    expect(
      one(view()).quick.map((option) => [option.label, option.hint]),
    ).toEqual([
      ['Just now', 'Today, 21:40'],
      ['Yesterday', 'Mon Nov 9'],
      ['Last weekend', 'Sat Nov 7'],
      ['On release day', 'Jun 22, 2023'],
    ]);
  });

  it('marks the current answer and selects its day', () => {
    const watchedAt = new Date(2024, 10, 12, 20, 31).getTime();
    const model = one(
      view({ watched: { S02E05: { runtime: 30, watchedAt } } }),
    );
    expect(model.subtitle).toBe('S02E05 · Pop · Currently Nov 12, 2024');
    expect(model.selected?.getTime()).toBe(watchedAt);
    expect(model.quick.some((option) => option.on)).toBe(false);
    expect(model.alt.at(-1)?.label).toBe('Not watched');
  });

  it('knows today, no date, skipped and release day', () => {
    const today = one(
      view({ watched: { S02E05: { runtime: 0, watchedAt: now } } }),
    );
    expect(today.quick[0]?.on).toBe(true);
    expect(today.subtitle).toBe('S02E05 · Pop · Currently today');
    const unknown = one(
      view({
        watched: { S02E05: { dateUnknown: true, runtime: 0, watchedAt: now } },
      }),
    );
    expect(unknown.alt[0]?.on).toBe(true);
    expect(unknown.selected).toBeNull();
    expect(unknown.subtitle).toBe(
      'S02E05 · Pop · Watched, don’t remember when',
    );
    const skipped = one(view({ skipped: ['S02E05'] }));
    expect(skipped.alt[1]?.on).toBe(true);
    expect(skipped.subtitle).toBe('S02E05 · Pop · Skipped');
    const release = one(
      view({
        watched: {
          S02E05: {
            runtime: 0,
            watchedAt: new Date(2023, 5, 22, 12).getTime(),
          },
        },
      }),
    );
    expect(release.quick[3]?.on).toBe(true);
  });

  it('marks New on I don’t remember and Skipped only', () => {
    expect(one(view()).alt.map((option) => option.isNew)).toEqual([true, true]);
    expect(one(view()).quick.some((option) => option.isNew)).toBe(false);
  });
});

describe('pickerModel: a set and a run', () => {
  const refs = Array.from({ length: 10 }, (_, index) => ({
    episodeNumber: index + 1,
    seasonNumber: 2,
  }));

  it('dates a season with one answer', () => {
    const model = pickerModel({
      now,
      request: { kind: 'set', refs, seriesId: 1, what: 'Season 2' },
      showTitle: 'The Bear',
      view: view({ watched: { S02E01: { runtime: 0, watchedAt: now } } }),
    });
    expect(model.title).toBe('When did you watch Season 2?');
    expect(model.subtitle).toBe('One date for all 10 episodes');
    expect(model.quick[3]?.hint).toBe('Each air date');
    expect(model.alt.map((option) => option.label)).toContain('Not watched');
  });

  it('names the show by its title', () => {
    const model = pickerModel({
      now,
      request: { kind: 'set', refs, seriesId: 1, what: WHOLE_SHOW },
      showTitle: 'The Bear',
      view: view(),
    });
    expect(model.title).toBe('When did you watch The Bear?');
  });

  it('never offers Not watched for a run', () => {
    const model = pickerModel({
      now,
      request: {
        kind: 'run',
        refs: refs.slice(5, 9),
        seriesId: 1,
        what: 'E6–E9',
      },
      showTitle: 'The Bear',
      view: view({ watched: { S02E06: { runtime: 0, watchedAt: now } } }),
    });
    expect(model.title).toBe('When did you watch E6–E9?');
    expect(model.alt.map((option) => option.label)).toEqual([
      'I don’t remember',
      'Skipped',
    ]);
  });
});
