// @vitest-environment jsdom
import { act, Suspense, use } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { useEpisodeState } from './hooks';
import MarkingProvider from './MarkingProvider';
import SeedSeries from './SeedSeries';
import type { SeriesSeed } from './types';

const SEED: SeriesSeed = {
  fetchedAt: 1_000,
  seasons: [{ airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 }],
  seriesId: 7,
  watched: [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1 }],
};

function Reader({ episodeNumber }: Readonly<{ episodeNumber: number }>) {
  const state = useEpisodeState(7, { episodeNumber, seasonNumber: 1 });
  return <span>{state ?? 'unseeded'}</span>;
}

/** A viewer hole: its own seed, then its readers (the page's real shape). */
function Hole({
  episodeNumber,
  ready,
}: Readonly<{ episodeNumber: number; ready?: Promise<void> }>) {
  if (ready) {
    use(ready);
  }
  return (
    <>
      <SeedSeries seed={SEED} />
      <Reader episodeNumber={episodeNumber} />
    </>
  );
}

function Page({ later }: Readonly<{ later?: Promise<void> }>) {
  return (
    <MarkingProvider>
      <p>shell: no marking reads</p>
      <Suspense fallback={<span>…</span>}>
        <Hole episodeNumber={1} />
      </Suspense>
      <Suspense fallback={<span>…</span>}>
        <Hole episodeNumber={2} ready={later} />
      </Suspense>
    </MarkingProvider>
  );
}

describe('hydrating holes that seed the same show', () => {
  it('hydrates without a recoverable error when one hole hydrates later', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Page />);
    expect(container.textContent).toContain('watched');

    const errors: unknown[] = [];
    let resolveLater: () => void = () => {};
    const later = new Promise<void>((resolve) => {
      resolveLater = resolve;
    });
    await act(async () => {
      hydrateRoot(container, <Page later={later} />, {
        onRecoverableError: (error) => errors.push(error),
      });
    });
    await act(async () => {
      resolveLater();
      await later;
    });

    expect(errors).toEqual([]);
    expect(container.textContent).toBe('shell: no marking readswatchednone');
  });
});
