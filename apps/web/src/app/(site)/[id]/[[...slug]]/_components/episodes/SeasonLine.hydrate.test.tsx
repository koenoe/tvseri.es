// @vitest-environment jsdom
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';

import { ClockProvider } from './clock';
import type { MarkedEpisode } from './marks';
import SeasonLine from './SeasonLine';
import { record, season } from './testData';

// Watched on 20 Aug 2025 at 00:30 in London (BST): 19 Aug in UTC
const WATCHED_AT = Date.UTC(2025, 7, 19, 23, 30);
const episodes = season(1, 2);
const marked: ReadonlyArray<MarkedEpisode> = [
  { episode: episodes[0]!, mark: 'watched', record: record(WATCHED_AT) },
  { episode: episodes[1]!, mark: 'next', record: undefined },
];

function Page() {
  return (
    <MarkingProvider>
      <ClockProvider>
        <SeasonLine
          episodes={episodes}
          marked={marked}
          seasonNumber={1}
          seriesId={1}
        />
      </ClockProvider>
    </MarkingProvider>
  );
}

const labelOf = (container: HTMLElement) =>
  container.querySelector('[data-index="0"]')?.getAttribute('aria-label');

describe('the season line reads the same day as the wall', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('after hydration: the UTC day, with the year, as the wall’s compact tiles', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 14, 10), toFake: ['Date'] });
    vi.stubEnv('TZ', 'Europe/London');
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Page />);
    await act(async () => {
      hydrateRoot(container, <Page />);
    });
    expect(labelOf(container)).toBe(
      'E01 · Episode 1 · Watched Aug 19, 2025 · Unmark',
    );
  });
});
