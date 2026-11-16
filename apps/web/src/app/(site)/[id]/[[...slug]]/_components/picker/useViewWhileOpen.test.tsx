// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingStoreApi } from '@/lib/marking/store';
import type { SeriesBase } from '@/lib/marking/types';

import useViewWhileOpen from './useViewWhileOpen';

const SERIES = 7;
const SEASONS = [{ airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 }];

let store: MarkingStoreApi | null = null;
const seen: Array<SeriesBase | undefined> = [];

function Probe({ open }: Readonly<{ open: boolean }>) {
  store = useMarkingStoreApi();
  seen.push(useViewWhileOpen(SERIES, open));
  return null;
}

const mark = (code: `S01E0${number}`) =>
  act(() => {
    store!.getState().begin(SERIES, {
      kind: 'mark',
      records: { [code]: { runtime: 0, watchedAt: 1 } },
    });
  });

function setup() {
  seen.length = 0;
  const view = (open: boolean) => (
    <MarkingProvider>
      <Probe open={open} />
    </MarkingProvider>
  );
  const result = render(view(true));
  act(() => {
    store!.getState().seed({ seasons: SEASONS, seriesId: SERIES }, 'seed');
  });
  return { rerender: (open: boolean) => result.rerender(view(open)) };
}

describe('useViewWhileOpen', () => {
  it('follows the marks while open', () => {
    setup();
    mark('S01E01');
    expect(seen.at(-1)?.watched.S01E01).toBeDefined();
  });

  it('closed, keeps the view it closed on and ignores later marks', () => {
    const { rerender } = setup();
    mark('S01E01');
    rerender(false);
    const closedOn = seen.at(-1);
    expect(closedOn?.watched.S01E01).toBeDefined();
    const renders = seen.length;
    mark('S01E02');
    expect(seen).toHaveLength(renders);
    rerender(true);
    expect(seen.at(-1)?.watched.S01E02).toBeDefined();
  });
});
