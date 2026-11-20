// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render as renderRaw,
  screen,
  waitFor,
} from '@testing-library/react';
import type {
  ConnectionUnresolved,
  ConnectionUnresolvedPage,
} from '@tvseri.es/schemas';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { appToggleId } from './AppsAccordion';
import { ServiceProvider } from './ServiceContext';
import ServiceReview from './ServiceReview';

const { dismiss, more, resolve, showToast, skipAll } = vi.hoisted(() => ({
  dismiss: vi.fn(),
  more: vi.fn(),
  resolve: vi.fn(),
  showToast: vi.fn(),
  skipAll: vi.fn(),
}));
vi.mock('../reviewActions', () => ({
  dismissEntries: dismiss,
  moreUnresolved: more,
  resolveEntries: resolve,
  skipAllEntries: skipAll,
}));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast }));

/** The card's parts read their service from the panel */
const render = (ui: ReactElement) =>
  renderRaw(ui, {
    wrapper: ({ children }) => (
      <ServiceProvider service="netflix">{children}</ServiceProvider>
    ),
  });

const candidate = (id: number, year: string, network: string) => ({
  id,
  network,
  posterImage: null,
  title: 'Top Boy',
  year,
});

const TOP_BOY: ConnectionUnresolved = {
  candidates: [
    candidate(1, '2019', 'Netflix'),
    candidate(2, '2011', 'Channel 4'),
  ],
  key: '101',
  kind: 'ambiguous',
  row: { episode: 'Episode 1', season: 'Season 1', title: 'Top Boy' },
  watchedAt: 1_700_000_000_000,
};

const LOST: ConnectionUnresolved = {
  key: '202',
  kind: 'series-not-found',
  row: { episode: 'Pilot', season: '', title: 'Lost Signals' },
  watchedAt: 1_700_000_100_000,
};

const LOST_TOO: ConnectionUnresolved = {
  ...LOST,
  key: '203',
  row: { episode: 'Pilot 2', season: '', title: 'Lost Signals' },
};

const NEW_ENTRY: ConnectionUnresolved = {
  key: '303',
  kind: 'series-not-found',
  row: { episode: 'One', season: '', title: 'Fresh Show' },
  watchedAt: 1_700_000_200_000,
};

const page = (
  items: ReadonlyArray<ConnectionUnresolved>,
  nextCursor: string | null = null,
): ConnectionUnresolvedPage => ({ items: [...items], nextCursor });

/** An action that answers only when `release` is called */
const deferred = <T,>() => {
  let release: (value: T) => void = () => {};
  const promise = new Promise<T>((resolvePromise) => {
    release = resolvePromise;
  });
  return { promise, release };
};

beforeEach(() => {
  for (const mock of [dismiss, more, resolve, showToast]) {
    mock.mockReset();
  }
});

describe('ServiceReview', () => {
  it('draws nothing when nothing needs checking', () => {
    const { container } = render(
      <ServiceReview count={0} overflow={0} page={page([])} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('lists the entries in the importer’s groups with the count', () => {
    render(
      <ServiceReview count={2} overflow={0} page={page([TOP_BOY, LOST])} />,
    );
    expect(screen.getByText('To review')).toBeTruthy();
    expect(screen.getByText(/^2 entries/)).toBeTruthy();
    expect(screen.getByText('Which series?')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '2011 · Channel 4' }),
    ).toBeTruthy();
    expect(screen.getByText('Lost Signals: Pilot')).toBeTruthy();
  });

  it('drops a pick at once, and for good once it is written', async () => {
    const answer = deferred<unknown>();
    resolve.mockReturnValue(answer.promise);
    render(
      <ServiceReview count={2} overflow={0} page={page([TOP_BOY, LOST])} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '2019 · Netflix' }));
    });
    expect(resolve).toHaveBeenCalledWith('netflix', {
      entries: [{ key: '101', row: TOP_BOY.row, watchedAt: TOP_BOY.watchedAt }],
      pick: { kind: 'series', seriesId: 1 },
    });
    // Optimistic: gone, and counted out, before the action answers
    expect(screen.queryByText('Which series?')).toBeNull();
    expect(screen.getByText(/^1 entry the sync/)).toBeTruthy();

    await act(async () => {
      answer.release({
        data: { closed: ['101'], failed: null, open: [], written: 1 },
        ok: true,
      });
    });
    expect(screen.queryByText('Which series?')).toBeNull();
    expect(showToast).toHaveBeenCalledWith({
      title: 'Marked 1 episode of Top Boy (2019)',
    });
  });

  it('brings an entry back with a toast when the write fails', async () => {
    resolve.mockResolvedValue({ error: 'failed', ok: false });
    render(
      <ServiceReview count={2} overflow={0} page={page([TOP_BOY, LOST])} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '2019 · Netflix' }));
    });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'error' }),
    );
    expect(screen.getByText('Which series?')).toBeTruthy();
  });

  it('skips an entry for good', async () => {
    dismiss.mockResolvedValue({
      data: { closed: ['202'], failed: null },
      ok: true,
    });
    render(
      <ServiceReview count={2} overflow={0} page={page([TOP_BOY, LOST])} />,
    );
    const skips = screen.getAllByRole('button', { name: 'Skip' });
    await act(async () => {
      fireEvent.click(skips[1] as HTMLElement);
    });
    expect(dismiss).toHaveBeenCalledWith('netflix', { keys: ['202'] });
    expect(screen.queryByText('Lost Signals: Pilot')).toBeNull();
    // Every entry is loaded: no Show more while the server's total catches up
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
    expect(showToast).toHaveBeenCalledWith({
      title: 'Skipped Lost Signals: Pilot',
    });
  });

  it('brings in the next entries by itself once every loaded one is done', async () => {
    dismiss.mockResolvedValue({
      data: { closed: ['202'], failed: null },
      ok: true,
    });
    more.mockResolvedValue({ data: page([TOP_BOY]), ok: true });
    render(<ServiceReview count={2} overflow={0} page={page([LOST], 'c1')} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    });
    expect(more).toHaveBeenCalledWith('netflix', 'c1');
    expect(screen.getByText('Top Boy')).toBeTruthy();
  });

  it('skips one group after asking once more', async () => {
    skipAll.mockResolvedValue({ data: { closed: 140 }, ok: true });
    render(
      <ServiceReview
        count={3}
        overflow={0}
        page={page(
          [
            LOST,
            { ...LOST, key: '203', row: { ...LOST.row, title: 'Elsewhere' } },
            TOP_BOY,
          ],
          'c1',
        )}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Skip all in Not found' }),
    );
    expect(skipAll).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Skip every entry in Not found, the ones not shown yet too? They won’t come back.',
      ),
    ).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip all' }));
    });
    expect(skipAll).toHaveBeenCalledWith('netflix', 'not-found');
    expect(showToast).toHaveBeenCalledWith({ title: 'Skipped 140 entries' });
  });

  it('takes a Skip all’s loaded entries off the list, leaving the other group', async () => {
    skipAll.mockResolvedValue({ data: { closed: 2 }, ok: true });
    render(
      <ServiceReview
        count={3}
        overflow={0}
        page={page([
          LOST,
          { ...LOST, key: '203', row: { ...LOST.row, title: 'Elsewhere' } },
          TOP_BOY,
        ])}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Skip all in Not found' }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip all' }));
    });
    await waitFor(() => expect(screen.queryByText('Not found')).toBeNull());
    expect(screen.getByText('Which series?')).toBeTruthy();
  });

  it('loads the next page on Show more', async () => {
    more.mockResolvedValue({ data: page([LOST]), ok: true });
    render(
      <ServiceReview count={2} overflow={0} page={page([TOP_BOY], 'c1')} />,
    );
    expect(screen.queryByText('Lost Signals: Pilot')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    });
    expect(more).toHaveBeenCalledWith('netflix', 'c1');
    expect(screen.getByText('Lost Signals: Pilot')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  /** The list item an entry's line sits in, as drawn now */
  const itemOf = (text: string) =>
    screen.getByText(text).closest<HTMLElement>('[data-leaving-item]');

  it('opens the entries Show more brings into the list', async () => {
    more.mockResolvedValue({ data: page([NEW_ENTRY]), ok: true });
    render(
      <ServiceReview
        count={3}
        overflow={0}
        page={page([TOP_BOY, LOST], 'c1')}
      />,
    );
    expect(itemOf('Lost Signals: Pilot')?.style.opacity).not.toBe('0');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    });
    // it starts shut and opens into its place
    expect(itemOf('Fresh Show: One')?.style.opacity).toBe('0');
  });

  it('draws the entries a sync adds at once', () => {
    const { rerender } = render(
      <ServiceReview count={2} overflow={0} page={page([TOP_BOY, LOST])} />,
    );
    rerender(
      <ServiceReview
        count={3}
        overflow={0}
        page={page([TOP_BOY, LOST, NEW_ENTRY])}
      />,
    );
    expect(itemOf('Fresh Show: One')?.style.opacity).not.toBe('0');
  });

  it('keeps what it loaded when the card refreshes', async () => {
    more.mockResolvedValue({ data: page([LOST]), ok: true });
    const { rerender } = render(
      <ServiceReview count={2} overflow={0} page={page([TOP_BOY], 'c1')} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    });
    rerender(
      <ServiceReview count={2} overflow={0} page={page([TOP_BOY], 'c1')} />,
    );
    expect(screen.getByText('Lost Signals: Pilot')).toBeTruthy();
  });

  it('says how many entries the list couldn’t keep', () => {
    render(
      <ServiceReview count={2} overflow={40} page={page([TOP_BOY, LOST])} />,
    );
    expect(
      screen.getByText('40 more weren’t kept: the list was full'),
    ).toBeTruthy();
  });

  it('still says so when nothing is left to fix', () => {
    render(<ServiceReview count={0} overflow={1} page={page([])} />);
    expect(screen.getByText('To review')).toBeTruthy();
    expect(
      screen.getByText('1 more wasn’t kept: the list was full'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('takes in entries a sync added while the card is open', () => {
    const { rerender } = render(
      <ServiceReview count={1} overflow={0} page={page([TOP_BOY])} />,
    );
    rerender(
      <ServiceReview
        count={2}
        overflow={0}
        page={page([NEW_ENTRY, TOP_BOY])}
      />,
    );
    expect(screen.getByText('Fresh Show: One')).toBeTruthy();
    expect(screen.getByText('Which series?')).toBeTruthy();
  });

  it('can load what the count says even without a cursor', async () => {
    more.mockResolvedValue({ data: page([TOP_BOY, LOST]), ok: true });
    render(<ServiceReview count={2} overflow={0} page={page([TOP_BOY])} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    });
    expect(more).toHaveBeenCalledWith('netflix', null);
    expect(screen.getByText('Lost Signals: Pilot')).toBeTruthy();
  });

  it('keeps what a Skip closed before it failed, and brings back the rest', async () => {
    dismiss.mockResolvedValue({
      data: { closed: ['202'], failed: 'failed' },
      ok: true,
    });
    render(
      <ServiceReview count={2} overflow={0} page={page([LOST, LOST_TOO])} />,
    );
    expect(screen.getByText('2 entries')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    });
    expect(dismiss).toHaveBeenCalledWith('netflix', { keys: ['202', '203'] });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'error' }),
    );
    expect(screen.getByText('1 entry')).toBeTruthy();
  });

  it('asks which episode when the pick has none that fits', async () => {
    const episodes = [
      { episodeNumber: 1, seasonNumber: 1, title: 'Genesis' },
      { episodeNumber: 2, seasonNumber: 1, title: 'Crossroads' },
    ];
    resolve.mockResolvedValue({
      data: {
        closed: [],
        failed: null,
        open: [
          {
            ...TOP_BOY,
            candidates: undefined,
            episodes,
            kind: 'episode-not-found',
            series: candidate(1, '2019', 'Netflix'),
          },
        ],
        written: 0,
      },
      ok: true,
    });
    render(<ServiceReview count={1} overflow={0} page={page([TOP_BOY])} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '2019 · Netflix' }));
    });
    expect(showToast).toHaveBeenCalledWith({
      title: 'No episode of Top Boy (2019) fits. Pick one from the list.',
    });
    // The entry is back, now asking for its episode
    expect(screen.queryByText('Which series?')).toBeNull();
    expect(screen.getByText('Not found')).toBeTruthy();
    expect(screen.getByText(/^1 entry the sync/)).toBeTruthy();
  });
});

describe('ServiceReview and focus', () => {
  it('moves focus to the next item when one leaves', async () => {
    dismiss.mockResolvedValue({
      data: { closed: ['101'], failed: null },
      ok: true,
    });
    render(
      <ServiceReview count={2} overflow={0} page={page([TOP_BOY, LOST])} />,
    );
    const skips = screen.getAllByRole('button', { name: 'Skip' });
    (skips[0] as HTMLElement).focus();
    await act(async () => {
      fireEvent.click(skips[0] as HTMLElement);
    });
    expect(document.activeElement?.textContent).toBe('Search manually');
  });

  it('moves focus to the card’s toggle when the list empties', async () => {
    dismiss.mockResolvedValue({
      data: { closed: ['202'], failed: null },
      ok: true,
    });
    render(
      <>
        <button id={appToggleId('netflix')} type="button">
          Hide Netflix
        </button>
        <ServiceReview count={1} overflow={0} page={page([LOST])} />
      </>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    });
    expect(document.activeElement?.textContent).toBe('Hide Netflix');
  });

  it('moves focus to the heading after a Skip all while entries remain', async () => {
    skipAll.mockResolvedValue({ data: { closed: 2 }, ok: true });
    render(
      <ServiceReview
        count={3}
        overflow={0}
        page={page([
          LOST,
          { ...LOST, key: '203', row: { ...LOST.row, title: 'Elsewhere' } },
          TOP_BOY,
        ])}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Skip all in Not found' }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip all' }));
    });
    expect(document.activeElement?.textContent).toBe('To review');
  });

  it('moves focus to the list’s heading when what’s left isn’t loaded', async () => {
    dismiss.mockResolvedValue({
      data: { closed: ['202'], failed: null },
      ok: true,
    });
    more.mockResolvedValue({ data: page([]), ok: true });
    render(<ServiceReview count={5} overflow={0} page={page([LOST], 'c1')} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    });
    expect(document.activeElement?.textContent).toBe('To review');
  });
});
