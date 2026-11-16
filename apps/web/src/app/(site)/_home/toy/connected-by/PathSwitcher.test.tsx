// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { forgetViewer } from '@/components/menu/displayCookie';
import { SIGN_IN_MESSAGE } from '@/lib/marking/copy';
import MarkingProvider from '@/lib/marking/MarkingProvider';
import { viewerFetch } from '@/lib/marking/testing/viewerFetch';

import PathSwitcher from './PathSwitcher';

const showToast = vi.fn();
vi.mock(import('@/lib/marking/actions'), async (importOriginal) => ({
  ...(await importOriginal()),
  setInList: () => Promise.resolve({ data: undefined, ok: true as const }),
}));
vi.mock('@/components/ui/toast/showToast', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

const ENDS = [
  { id: 101, title: 'Dark' },
  { id: 102, title: 'Devs' },
];
const TITLES = ['Silo to Dark, in 2 steps', 'Silo to Devs, in 2 steps'];
const CHAINS = ['chain to Dark', 'chain to Devs'];

const renderSwitcher = (ends = ENDS) =>
  render(
    <MarkingProvider>
      <PathSwitcher
        chains={CHAINS}
        ends={ends}
        label={<h2>Connected by</h2>}
        titles={TITLES.slice(0, ends.length)}
      />
    </MarkingProvider>,
  );

/** The head's Watchlist (from md) and the phone's under the path: the same action */
const watchlists = (title: string) =>
  screen.getAllByRole('button', {
    name: new RegExp(`${title} (to|from) your watchlist`),
  });

beforeEach(() => {
  forgetViewer();
});

afterEach(() => {
  vi.unstubAllGlobals();
  showToast.mockReset();
});

describe('Connected by: the end’s Watchlist', () => {
  it('adds the end of the path on screen, in the head beside Another path and under the path on a phone', () => {
    renderSwitcher();

    const [head, foot] = watchlists('Dark');
    expect(head?.textContent).toBe('Watchlist');
    const headRow = head?.closest('[data-watchlist-toggle]');
    expect(headRow?.className).toContain('max-md:hidden');
    expect(foot?.closest('div')?.className).toContain('md:hidden');
    // the head's pair: the Watchlist toggle, then Another path
    const pair = headRow?.parentElement;
    expect(
      [...(pair?.children ?? [])].map((child) =>
        child.hasAttribute('data-watchlist-toggle')
          ? 'toggle'
          : child.textContent,
      ),
    ).toEqual(['toggle', 'Another path']);
  });

  it('follows Another path to the next end', () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: 'Another path' }));

    expect(screen.getByText('Silo to Devs, in 2 steps')).toBeTruthy();
    expect(watchlists('Devs')).toHaveLength(2);
    expect(screen.queryAllByRole('button', { name: /Dark/ })).toHaveLength(0);
  });

  it('keeps the Watchlist when there is one path, without Another path', () => {
    renderSwitcher(ENDS.slice(0, 1));

    expect(watchlists('Dark')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Another path' })).toBeNull();
  });

  it('signed out: asks to sign in', () => {
    renderSwitcher();

    fireEvent.click(watchlists('Dark')[0]!);

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: SIGN_IN_MESSAGE }),
    );
  });

  it('signed in: adds the end and shows it added, pressed', async () => {
    document.cookie = '__tvseries_user=nina; Path=/';
    const fetch = viewerFetch();
    vi.stubGlobal('fetch', fetch);
    renderSwitcher();
    // the viewer's library first: the mark is optimistic on top of it
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await act(async () => {});

    fireEvent.click(watchlists('Dark')[0]!);

    await waitFor(() =>
      expect(
        watchlists('Dark').map((button) => [
          button.getAttribute('aria-label'),
          button.getAttribute('aria-pressed'),
        ]),
      ).toEqual([
        ['Remove Dark from your watchlist', 'true'],
        ['Remove Dark from your watchlist', 'true'],
      ]),
    );
  });

  it('signed in: no read of its own, so only its press changes it (an end is never on the viewer’s lists)', async () => {
    document.cookie = '__tvseries_user=nina; Path=/';
    const fetch = viewerFetch({ watchlist: [101] });
    vi.stubGlobal('fetch', fetch);
    renderSwitcher();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await act(async () => {});

    expect(watchlists('Dark')[0]?.getAttribute('aria-pressed')).toBe('false');
  });
});
