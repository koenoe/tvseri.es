import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { useEpisodeState } from './hooks';
import MarkingProvider from './MarkingProvider';
import SeedSeries from './SeedSeries';

const SEED = {
  seasons: [{ airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 }],
  seriesId: 7,
  watched: [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1 }],
};

function Reader() {
  const state = useEpisodeState(7, { episodeNumber: 1, seasonNumber: 1 });
  return <span>{state ?? 'unseeded'}</span>;
}

describe('MarkingProvider on the server', () => {
  it('lets controls read a show seeded earlier in the same render', () => {
    const html = renderToString(
      <MarkingProvider>
        <SeedSeries seed={SEED} />
        <Reader />
      </MarkingProvider>,
    );
    expect(html).toContain('watched');
    expect(html).not.toContain('unseeded');
  });
});
