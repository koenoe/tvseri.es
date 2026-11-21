// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingStoreApi } from '@/lib/marking/store';

import ShowProvider from '../../_lib/ShowProvider';
import type { ShowSummary } from '../../_lib/show';
import SeasonSection from './SeasonSection';
import { createSheetUi, SheetUiContext, type SheetUiStore } from './sheetUi';

const SERIES = 9101;

const show: ShowSummary = {
  backdrop: '',
  id: SERIES,
  logo: '',
  nextEpisodeToAir: null,
  seasons: [1, 2, 3].map((seasonNumber) => ({
    airDate: '2020-01-01',
    airedEpisodeCount: 10,
    episodeCount: 10,
    seasonNumber,
    title: `Season ${seasonNumber}`,
  })),
  slug: 'test',
  status: 'Ended',
  title: 'Test',
};

/** Renders of one grid chip: each asks `markChipClass` for its layout. */
const renders = vi.hoisted(() => ({ chips: 0 }));
vi.mock('./MarkChip', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./MarkChip')>();
  return {
    ...actual,
    markChipClass: (...args: Parameters<typeof actual.markChipClass>) => {
      if (args[2]?.includes('min-w-14')) {
        renders.chips += 1;
      }
      return actual.markChipClass(...args);
    },
  };
});

let store: MarkingStoreApi | null = null;
let sheet: SheetUiStore | null = null;
function GrabStore() {
  store = useMarkingStoreApi();
  return null;
}

describe('SeasonSection', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function setup(beforeSeed?: (view: ReturnType<typeof render>) => void) {
    renders.chips = 0;
    sheet = createSheetUi();
    const view = render(
      <MarkingProvider>
        <GrabStore />
        <ShowProvider show={show}>
          <SheetUiContext value={sheet}>
            {show.seasons.map((season) => (
              <SeasonSection
                initial={false}
                key={season.seasonNumber}
                season={season}
              />
            ))}
          </SheetUiContext>
        </ShowProvider>
      </MarkingProvider>,
    );
    beforeSeed?.(view);
    act(() => {
      store!.getState().seed(
        {
          fetchedAt: 1,
          seasons: show.seasons,
          seriesId: SERIES,
          status: {
            isFavorited: false,
            isWatchlisted: false,
            prefs: {
              firstTrackingAnsweredAt: null,
              neverAskBefore: false,
              skipped: [],
            },
          },
          watched: [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1 }],
        },
        'seed',
      );
    });
    // every chip of the three seasons drawn once seeded
    expect(renders.chips).toBeGreaterThanOrEqual(30);
    renders.chips = 0;
  }

  const mark = (code: `S${string}E${string}`) =>
    act(() => {
      store!.getState().begin(SERIES, {
        kind: 'mark',
        records: { [code]: { runtime: 0, watchedAt: 2 } },
      });
    });

  it('draws chip ghosts, nothing to press, until the viewer’s marks seed the show', () => {
    setup(({ container }) => {
      expect(
        container.querySelectorAll('[data-chip-ghost] > span'),
      ).toHaveLength(30);
      expect(screen.queryAllByRole('button', { name: /^S0\dE\d/ })).toEqual([]);
      expect(screen.queryByText(/ of 10$/)).toBeNull();
    });
    expect(document.querySelector('[data-chip-ghost]')).toBeNull();
    expect(screen.getAllByRole('button', { name: /^S01E\d/ })).toHaveLength(10);
    expect(screen.getByText('1 of 10')).toBeTruthy();
  });

  it('a mark re-renders only the chip it changed, in no other season', () => {
    setup();
    // S02E05 turns watched; Next up (S01E02) stays where it is
    mark('S02E05');
    expect(renders.chips).toBe(1);
  });

  it('marking Next up re-renders it and the chip Next up moves to', () => {
    setup();
    mark('S01E02');
    expect(renders.chips).toBe(2);
    const pressed = (name: RegExp) =>
      screen.getByRole('button', { name }).getAttribute('aria-pressed');
    expect(pressed(/^S01E02 · /)).toBe('true');
    expect(pressed(/^S01E03 · Not watched$/)).toBe('false');
  });

  describe('answering "Mark the N before too?"', () => {
    /** S01E05 just marked, with S01E02–04 still open before it */
    function ask() {
      setup();
      const target = { episodeNumber: 5, seasonNumber: 1 };
      act(() => sheet!.setState({ ask: target, last: target }));
    }
    const chip = () => screen.getByRole('button', { name: /^S01E05 · / });

    it.each(['No', 'Yes, just now', 'Never for this series'])(
      '“%s” hands focus back to the chip it asked about',
      (answer) => {
        ask();
        const button = screen.getByRole('button', { name: answer });
        button.focus();
        fireEvent.click(button);
        expect(screen.queryByRole('group', { name: /before too/ })).toBeNull();
        expect(document.activeElement).toBe(chip());
      },
    );

    it('leaves focus alone when it isn’t in the ask', () => {
      ask();
      const other = screen.getByRole('button', { name: /^S02E01 · / });
      other.focus();
      fireEvent.click(screen.getByRole('button', { name: 'No' }));
      expect(document.activeElement).toBe(other);
    });
  });
});
