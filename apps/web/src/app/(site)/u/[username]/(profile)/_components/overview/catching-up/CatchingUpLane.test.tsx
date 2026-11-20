// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import type { CatchingUpItem } from '@tvseri.es/schemas';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// the row as a title and a control: what the lane does with it is the test
vi.mock('../lane-rows/CatchingUpRow', () => ({
  default: ({ item }: Readonly<{ item: CatchingUpItem }>) => (
    <div>
      <a href={`/${item.slug}`}>{item.title}</a>
    </div>
  ),
}));

import MotionProvider from '@/components/motion/MotionProvider';
import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingStoreApi } from '@/lib/marking/store';

import CatchingUpLane from './CatchingUpLane';

const code = (episode: number) => `S01E0${episode}`;

/** A show with episodes 1 to 3 waiting, the API's three codes */
const item = (seriesId: number, title: string): CatchingUpItem => ({
  episodeRuntimes: [30, 30, 30],
  episodes: [code(1), code(2), code(3)],
  nextUp: code(1),
  posterImage: '',
  runtime: 30,
  runtimeMinutes: 90,
  runway: null,
  seriesId,
  slug: title.toLowerCase(),
  title,
  waiting: 3,
});

const ROWS = [
  { item: item(1, 'Andor'), nextUp: code(1) },
  { item: item(2, 'Severance'), nextUp: code(1) },
];

let store: MarkingStoreApi | null = null;
function GrabStore() {
  store = useMarkingStoreApi();
  return null;
}

const markAll = (seriesId: number) =>
  act(() => {
    const state = store?.getState();
    state?.seed(
      {
        fetchedAt: 1,
        seasons: [{ airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 }],
        seriesId,
        watched: [],
      },
      `seed-${seriesId}`,
    );
    state?.begin(seriesId, {
      kind: 'mark',
      records: Object.fromEntries(
        [1, 2, 3].map((episode) => [
          code(episode),
          { runtime: 0, watchedAt: 2000 },
        ]),
      ),
    });
  });

function setup() {
  render(
    <MarkingProvider>
      <MotionProvider>
        <GrabStore />
        <CatchingUpLane empty={<p>All caught up</p>} rows={ROWS} />
      </MotionProvider>
    </MarkingProvider>,
  );
  return screen.getByRole('region', { name: 'Catching up' });
}

describe('CatchingUpLane', () => {
  it('counts the shows still waiting, as their rows leave', () => {
    const lane = setup();
    // the number read out; the drawn digits roll beside it (`RollingCount`)
    const said = { selector: '.sr-only' };
    expect(within(lane).getByText('2', said)).toBeTruthy();
    markAll(1);
    expect(within(lane).getByText('1', said)).toBeTruthy();
    expect(within(lane).queryByText('2', said)).toBeNull();
  });

  it('swaps in its empty state once the last row has gone', async () => {
    const lane = setup();
    markAll(1);
    markAll(2);
    // the last rows still fold out: not empty yet
    expect(within(lane).queryByText('All caught up')).toBeNull();
    await vi.waitFor(
      () => expect(within(lane).getByText('All caught up')).toBeTruthy(),
      { timeout: 3000 },
    );
    expect(within(lane).queryByRole('link')).toBeNull();
  });
});
