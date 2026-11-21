// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import SeedSeries from '@/lib/marking/SeedSeries';
import type { MarkingStoreApi } from '@/lib/marking/store';

vi.mock('../history/HistorySheetIsland', () => ({
  preloadHistorySheet: () => undefined,
}));

import ProgressBar from './ProgressBar';
import { NO_RUNTIMES } from './progressLine';
import { forgetLines, rememberedLine } from './rememberedLine';

const SERIES = 7;

/** Ten episodes, nine watched: E10 finishes the show */
const SEED = {
  fetchedAt: 1,
  seasons: [{ airedEpisodeCount: 10, episodeCount: 10, seasonNumber: 1 }],
  seriesId: SERIES,
  status: null,
  watched: Array.from({ length: 9 }, (_, index) => ({
    episodeNumber: index + 1,
    seasonNumber: 1,
    watchedAt: 1,
  })),
};

let store: MarkingStoreApi;
function Capture({ children }: Readonly<{ children: ReactNode }>) {
  store = useMarkingStoreApi();
  return children;
}

/** The tab's provider, the hole's seed and (`shown`) the line */
const tree = (shown = true) => (
  <MarkingProvider>
    <Capture>
      <SeedSeries seed={SEED} />
      {shown ? (
        <ProgressBar
          nextAirDate={null}
          runtimes={NO_RUNTIMES}
          seriesId={SERIES}
          signedIn
        />
      ) : null}
    </Capture>
  </MarkingProvider>
);
const SHEEN = 'i[style*="--sheen-ms"]';

const MARK_E10 = {
  kind: 'mark',
  records: { S01E10: { runtime: 0, watchedAt: 2 } },
} as const;

/** What a finishing mark does to the store: the mark, then the moment */
const finish = () => {
  let id = 0;
  act(() => {
    id = store.getState().begin(SERIES, MARK_E10);
    store.getState().culminate({
      finished: true,
      seasons: [1],
      seriesId: SERIES,
    });
  });
  return id;
};

const percentOf = (container: HTMLElement) =>
  container.querySelector('b')?.textContent;

describe('ProgressBar: the finish', () => {
  it('a finish while on screen: one sheen over the line, the % rolls up to 100%', () => {
    const { container } = render(tree());
    expect(percentOf(container)).toBe('90%');
    expect(container.querySelector(SHEEN)).toBeNull();
    finish();
    expect(container.querySelectorAll(SHEEN)).toHaveLength(1);
    // the roll starts from where the line was
    expect(percentOf(container)).toBe('90%');
  });

  it('undone, it is over: finished again with no new moment (Undo, Try again) plays nothing', () => {
    const { container } = render(tree());
    const id = finish();
    act(() => store.getState().fail(SERIES, id));
    expect(percentOf(container)).toBe('90%');
    expect(container.querySelector(SHEEN)).toBeNull();
    act(() => {
      store.getState().begin(SERIES, MARK_E10);
    });
    expect(percentOf(container)).toBe('100%');
    expect(container.querySelector(SHEEN)).toBeNull();
  });

  it('a show already finished when the line mounts plays nothing', () => {
    const { container, rerender } = render(tree(false));
    finish();
    rerender(tree());
    expect(percentOf(container)).toBe('100%');
    expect(container.querySelector(SHEEN)).toBeNull();
  });
});

describe('ProgressBar: the line this tab drew', () => {
  // `ProgressFallback` draws it at once on the next visit; written once the
  // line is on screen, never from a render React may throw away
  it('is remembered once it is drawn', () => {
    forgetLines();
    render(tree());
    expect(rememberedLine(SERIES)).toEqual({
      nextAirDate: null,
      runtimes: NO_RUNTIMES,
    });
  });
});
