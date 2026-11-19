import { describe, expect, it } from 'vitest';

import { fallbackRuntime, markEpisodes, runtimeTotal, weightOf } from './marks';
import { season, view } from './testData';

const items = (runtimes: ReadonlyArray<number>) =>
  season(1, runtimes.length, runtimes).map((episode) => ({ episode }));

describe('episode runtimes', () => {
  it('sums the runtimes, an unknown one counted as the fallback', () => {
    expect(runtimeTotal(items([30, 0, 45]), 40)).toBe(115);
  });

  it('falls back to the mean of the known runtimes, never an invented one', () => {
    expect(
      fallbackRuntime([{ runtime: 30 }, { runtime: 0 }, { runtime: 45 }]),
    ).toBe(38);
    expect(fallbackRuntime([{ runtime: 0 }])).toBe(0);
  });

  it('weighs an episode by its runtime, equal when none is known', () => {
    expect(weightOf({ runtime: 0 }, 30)).toBe(30);
    expect(weightOf({ runtime: 0 }, 0)).toBe(1);
  });
});

describe('markEpisodes on a show TMDB numbers on across seasons', () => {
  it('reads the aired count from the season’s first real episode', () => {
    // Naruto Shippuden S2 is E33…E53; 8 aired (E33…E40)
    const episodes = season(2, 21).map((episode) => ({
      ...episode,
      episodeNumber: episode.episodeNumber + 32,
    }));
    const marked = markEpisodes(
      view({
        seasons: [
          {
            airedEpisodeCount: 8,
            episodeCount: 21,
            firstEpisodeNumber: 33,
            seasonNumber: 2,
          },
        ],
      }),
      2,
      episodes,
      null,
    );
    const unaired = marked.filter((item) => item.mark === 'unaired');
    expect(unaired.map((item) => item.episode.episodeNumber)[0]).toBe(41);
    expect(unaired).toHaveLength(13);
  });
});
