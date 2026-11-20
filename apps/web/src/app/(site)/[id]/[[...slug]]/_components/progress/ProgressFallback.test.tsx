// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';
import SeedSeries from '@/lib/marking/SeedSeries';
import type { SeriesSeed } from '@/lib/marking/types';

vi.mock('../history/HistorySheetIsland', () => ({
  preloadHistorySheet: () => undefined,
}));

import ProgressBar from './ProgressBar';
import ProgressFallback from './ProgressFallback';
import { forgetLines } from './rememberedLine';

const SERIES = 7;
const SEASONS = [{ airedEpisodeCount: 4, episodeCount: 4, seasonNumber: 1 }];
const WATCHED = [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1 }];

/** The viewer's seed, as the show's holes and the seed route build it */
const FULL: SeriesSeed = {
  fetchedAt: 1,
  seasons: SEASONS,
  seriesId: SERIES,
  status: null,
  watched: WATCHED,
};

/** The page's hole, as it drew the line on an earlier visit in this tab */
const visited = () =>
  render(
    <MarkingProvider>
      <ProgressBar
        nextAirDate={null}
        runtimes={{ 1: [30, 30, 30, 30] }}
        seriesId={SERIES}
        signedIn
      />
    </MarkingProvider>,
  ).unmount();

const fallback = (seed: SeriesSeed | null) => (
  <MarkingProvider>
    {seed ? <SeedSeries seed={seed} /> : null}
    <ProgressFallback seriesId={SERIES} />
  </MarkingProvider>
);

const LINE = '[data-slot="progress"]';
const SKELETON = '[data-placeholder="progress"]';

beforeEach(() => forgetLines());

describe('ProgressFallback: the progress hole while it streams', () => {
  it('a show this tab has drawn, its marks in the store: the real line, with the time left', () => {
    visited();
    const { container } = render(fallback(FULL));
    expect(container.querySelector(SKELETON)).toBeNull();
    expect(container.querySelector(LINE)?.getAttribute('aria-label')).toBe(
      '25% watched: 1 of 4, 3 to go, 1 hour 30 minutes left: open watch history',
    );
  });

  it('the server (and the shell) always draws the skeleton', () => {
    visited();
    const html = renderToString(fallback(FULL));
    expect(html).toContain('data-placeholder="progress"');
    expect(html).not.toContain('data-slot="progress"');
  });

  it('marks only from a hover (never drawn here): the skeleton', () => {
    const { container } = render(fallback(FULL));
    expect(container.querySelector(SKELETON)).not.toBeNull();
  });

  it('a seed without the viewer’s marks (signed out, or the read failed): the skeleton', () => {
    visited();
    const signedOut = render(fallback({ seasons: SEASONS, seriesId: SERIES }));
    expect(signedOut.container.querySelector(SKELETON)).not.toBeNull();
    signedOut.unmount();
    const failed = render(
      fallback({ seasons: SEASONS, seriesId: SERIES, unavailable: true }),
    );
    expect(failed.container.querySelector(SKELETON)).not.toBeNull();
  });

  it('nothing in the store: the skeleton', () => {
    visited();
    const { container } = render(fallback(null));
    expect(container.querySelector(SKELETON)).not.toBeNull();
  });
});
