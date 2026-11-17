// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { forgetViewer } from '@/components/menu/displayCookie';
import type { ControlState, ControlStates } from '@/lib/marking/controlState';
import { SIGN_IN_MESSAGE } from '@/lib/marking/copy';
import MarkingProvider from '@/lib/marking/MarkingProvider';
import { viewerFetch } from '@/lib/marking/testing/viewerFetch';
import { setCookie } from '@/test/setCookie';
import WatchlistToggle from './WatchlistToggle';

const showToast = vi.fn();
vi.mock('@/components/ui/toast/showToast', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));
vi.mock(import('@/lib/marking/actions'), async (importOriginal) => ({
  ...(await importOriginal()),
  setInList: () => new Promise(() => {}),
}));

const ID = 9;

const renderToggle = async (
  props: Readonly<{
    label?: string;
    state?: ControlState | null;
    withRead?: boolean;
  }> = {},
) => {
  const { label, state = null, withRead = true } = props;
  const states = withRead
    ? Promise.resolve<ControlStates | null>(state ? { [ID]: state } : null)
    : undefined;
  let view: ReturnType<typeof render> | undefined;
  await act(async () => {
    view = render(
      <MarkingProvider>
        <WatchlistToggle
          className="relative z-3"
          id={ID}
          label={label}
          states={states}
          title="Dept. Q"
        />
      </MarkingProvider>,
    );
  });
  return view;
};

const toggle = () => screen.getByRole('button', { name: /Dept\. Q/ });

beforeEach(() => {
  forgetViewer();
});

afterEach(() => {
  vi.unstubAllGlobals();
  showToast.mockReset();
});

describe('WatchlistToggle: outlined, two states, one box', () => {
  it('signed out: "+ Watchlist", and a press asks to sign in', async () => {
    const view = await renderToggle();
    expect(toggle().textContent).toBe('Watchlist');
    // the box: both faces laid out unseen, so a swap never resizes it
    const row = view?.container.querySelector('[data-watchlist-toggle]');
    expect(row?.textContent).toContain('On watchlist');
    fireEvent.click(toggle());
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: SIGN_IN_MESSAGE }),
    );
  });

  it('on the watchlist: "On watchlist", the filled bookmark, pressed', async () => {
    await renderToggle({ state: { kind: 'watchlist', onWatchlist: true } });
    expect(toggle().textContent).toBe('On watchlist');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(toggle().getAttribute('aria-label')).toBe(
      'Remove Dept. Q from your watchlist',
    );
  });

  it('a started show with its watchlist entry parked is on', async () => {
    await renderToggle({
      state: {
        kind: 'watching',
        next: null,
        onWatchlist: true,
        seasonTotal: null,
        seasonWatched: null,
      },
    });
    expect(toggle().textContent).toBe('On watchlist');
  });

  it('a press adds; Undo puts it back', async () => {
    setCookie('__tvseries_user=nina; Path=/');
    vi.stubGlobal('fetch', viewerFetch());
    await renderToggle({ state: { kind: 'new', onWatchlist: false } });
    fireEvent.click(toggle());
    expect(
      await screen.findByRole('button', {
        name: 'Remove Dept. Q from your watchlist',
      }),
    ).toBeTruthy();
    const undo = showToast.mock.calls
      .map(([toast]) => toast as { action?: { onClick: () => void } })
      .find((toast) => toast.action)?.action;
    act(() => undo?.onClick());
    expect(toggle().textContent).toBe('Watchlist');
  });

  it('no read (Binge): its own label, and "+" until the tab knows the series', async () => {
    setCookie('__tvseries_user=nina; Path=/');
    const fetch = viewerFetch({ watchlist: [ID] });
    vi.stubGlobal('fetch', fetch);
    await renderToggle({ label: 'Add to watchlist', withRead: false });
    // the library loaded with the show on it: no swap after the paint
    expect(fetch).toHaveBeenCalled();
    expect(toggle().textContent).toBe('Add to watchlist');
  });
});
