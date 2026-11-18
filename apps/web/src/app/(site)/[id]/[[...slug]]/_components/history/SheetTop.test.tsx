// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WHOLE_SHOW } from '@/lib/marking/copy';
import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingStoreApi } from '@/lib/marking/store';

import { closeDialogs, useDialogs } from '../../_lib/dialogs';
import ShowProvider from '../../_lib/ShowProvider';
import type { ShowSummary } from '../../_lib/show';
import SheetTop from './SheetTop';
import { SHEET_MODE_KEY } from './sheetMode';
import { createSheetUi, SheetUiContext } from './sheetUi';

const show: ShowSummary = {
  backdrop: '',
  id: 9102,
  logo: '',
  nextEpisodeToAir: null,
  seasons: [],
  slug: 'test',
  status: 'Ended',
  title: 'Test',
};

const mount = (store: ReturnType<typeof createSheetUi>) =>
  render(
    <MarkingProvider>
      <ShowProvider show={show}>
        <SheetUiContext value={store}>
          <SheetTop />
        </SheetUiContext>
      </ShowProvider>
    </MarkingProvider>,
  );

describe('a fresh sheet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('opens in Tap sets a date', () => {
    const store = createSheetUi();
    expect(store.getState().mode).toBe('date');
    mount(store);
    const pressed = (name: string) =>
      screen.getByRole('button', { name }).getAttribute('aria-pressed');
    expect(pressed('Tap sets a date')).toBe('true');
    expect(pressed('Tap marks')).toBe('false');
    expect(pressed('Up to here')).toBe('false');
    expect(
      screen.getByText(/^Tap picks a date · drag across episodes/),
    ).toBeTruthy();
  });

  it('remembers the picked mode for the next opening', () => {
    mount(createSheetUi());
    fireEvent.click(screen.getByRole('button', { name: 'Tap marks' }));
    expect(createSheetUi().getState().mode).toBe('mark');
    fireEvent.click(screen.getByRole('button', { name: 'Up to here' }));
    expect(createSheetUi().getState().mode).toBe('upto');
  });

  it('falls back to a date for an unknown or malformed value', () => {
    for (const raw of [
      'nope',
      '{"v":1,"mode":"wild"}',
      '{"v":2,"mode":"mark"}',
      '[]',
    ]) {
      window.localStorage.setItem(SHEET_MODE_KEY, raw);
      expect(createSheetUi().getState().mode).toBe('date');
    }
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = createSheetUi();
    expect(store.getState().mode).toBe('date');
    mount(store);
    fireEvent.click(screen.getByRole('button', { name: 'Tap marks' }));
    expect(store.getState().mode).toBe('mark');
  });

  it('shows the legend only while its button is pressed', () => {
    const { container } = mount(createSheetUi());
    const shown = () => screen.queryByText('Not watched') !== null;
    expect(shown()).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Legend' }));
    expect(shown()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Legend' }));
    expect(shown()).toBe(false);
    expect(container.textContent).not.toContain('legend ?');
    expect(container.textContent).not.toContain(': null');
  });
});

const seasons = [0, 1, 2].map((seasonNumber) => ({
  airDate: '2020-01-01',
  airedEpisodeCount: 2,
  episodeCount: 2,
  seasonNumber,
  title: seasonNumber ? `Season ${seasonNumber}` : 'Specials',
}));

let markingStore: MarkingStoreApi | null = null;
function GrabStore() {
  markingStore = useMarkingStoreApi();
  return null;
}

/** The sheet top over a seeded show with `watched` episodes. */
function mountSeeded(
  watched: ReadonlyArray<
    Readonly<{ seasonNumber: number; episodeNumber: number }>
  >,
  skipped: ReadonlyArray<string> = [],
) {
  render(
    <MarkingProvider>
      <GrabStore />
      <ShowProvider show={{ ...show, seasons }}>
        <SheetUiContext value={createSheetUi()}>
          <SheetTop />
        </SheetUiContext>
      </ShowProvider>
    </MarkingProvider>,
  );
  act(() => {
    markingStore!.getState().seed(
      {
        fetchedAt: 1,
        seasons,
        seriesId: show.id,
        status: {
          isFavorited: false,
          isWatchlisted: false,
          prefs: {
            firstTrackingAnsweredAt: null,
            neverAskBefore: false,
            skipped: [...skipped],
          },
        },
        watched: watched.map((ref) => ({ ...ref, watchedAt: 1 })),
      },
      'seed',
    );
  });
}

describe('the whole series’ calendar', () => {
  afterEach(() => {
    closeDialogs();
  });

  it('dates every aired regular episode not watched yet, skipped included', () => {
    mountSeeded([{ episodeNumber: 1, seasonNumber: 1 }], ['S02E01']);
    fireEvent.click(
      screen.getByRole('button', { name: 'When did you watch Test?' }),
    );
    expect(useDialogs.getState().picker).toEqual({
      kind: 'set',
      refs: [
        { episodeNumber: 2, seasonNumber: 1 },
        { episodeNumber: 1, seasonNumber: 2 },
        { episodeNumber: 2, seasonNumber: 2 },
      ],
      seriesId: show.id,
      what: WHOLE_SHOW,
    });
  });

  it('is disabled once every aired episode is watched', () => {
    mountSeeded(
      [1, 2].flatMap((seasonNumber) =>
        [1, 2].map((episodeNumber) => ({ episodeNumber, seasonNumber })),
      ),
    );
    const button = screen.getByRole('button', {
      name: 'When did you watch Test?',
    });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(useDialogs.getState().picker).toBeNull();
  });
});
