// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { VersusPair, VersusSide } from '@tvseri.es/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { forgetViewer } from '@/components/menu/displayCookie';
import { SIGNED_IN_ONLY, SIGNED_OUT_ONLY } from '@/components/ui/viewer/reveal';
import { SIGN_IN_MESSAGE } from '@/lib/marking/copy';
import MarkingProvider from '@/lib/marking/MarkingProvider';
import { viewerFetch } from '@/lib/marking/testing/viewerFetch';
import { setCookie } from '@/test/setCookie';
import VersusDeck from './VersusDeck';

const showToast = vi.fn();
vi.mock(import('@/lib/marking/actions'), async (importOriginal) => ({
  ...(await importOriginal()),
  setInList: () => Promise.resolve({ data: undefined, ok: true as const }),
}));
vi.mock('@/components/ui/toast/showToast', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

const side = (id: number, title: string): VersusSide => ({
  episodes: 8,
  id,
  posterImage: `https://image.tmdb.org/t/p/w342/p${id}.jpg`,
  seasons: 1,
  slug: title.toLowerCase(),
  title,
  voteAverage: 8,
  years: '2020',
});

const PAIRS: ReadonlyArray<VersusPair> = [
  { left: side(1, 'Dark'), right: side(2, 'Devs') },
  { left: side(3, 'Silo'), right: side(4, 'Severance') },
];

const library = (watched: ReadonlyArray<number>) =>
  vi.fn(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          favorites: [],
          inProgress: [],
          watched,
          watchlist: [],
        }),
      ),
    ),
  );

const signIn = () => {
  setCookie('__tvseries_user=nina; Path=/');
};

const renderDeck = () =>
  render(
    <MarkingProvider>
      <VersusDeck pairs={PAIRS} />
    </MarkingProvider>,
  );

const poster = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  // the page's "signed in?" answer is cached per page: start each test afresh
  forgetViewer();
});

afterEach(() => {
  vi.unstubAllGlobals();
  showToast.mockReset();
});

describe('Versus: tap the one you would start', () => {
  it('chooses a poster and swaps the hint for the actions', () => {
    renderDeck();
    expect(screen.getByText('Tap the one you would start')).toBeTruthy();

    fireEvent.click(poster('Dark'));

    expect(poster('Dark').getAttribute('aria-pressed')).toBe('true');
    expect(poster('Devs').getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText('Tap the one you would start')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Open Dark' }).getAttribute('href'),
    ).toBe('/1/dark');
    expect(
      screen.getByRole('button', { name: 'Add Dark to your watchlist' })
        .textContent,
    ).toBe('Watchlist');
    expect(screen.getByText('You would start Dark')).toBeTruthy();
  });

  it('switches to the other poster, and clears when the chosen one is tapped again', () => {
    renderDeck();
    fireEvent.click(poster('Dark'));
    fireEvent.click(poster('Devs'));

    expect(poster('Devs').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('link', { name: 'Open Devs' })).toBeTruthy();

    fireEvent.click(poster('Devs'));

    expect(poster('Devs').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Tap the one you would start')).toBeTruthy();
  });

  it('“Another pair” shows the next pair, unchosen, and wraps around', () => {
    renderDeck();
    fireEvent.click(poster('Dark'));
    fireEvent.click(screen.getByRole('button', { name: 'Another pair' }));

    expect(poster('Silo').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Tap the one you would start')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Another pair' }));
    expect(poster('Dark')).toBeTruthy();
  });

  it('signed out: every pair, the card shown, and Watchlist asks to sign in', () => {
    renderDeck();
    const frame = document.querySelector('[data-slot="toy"]');
    expect(frame?.hasAttribute(SIGNED_OUT_ONLY)).toBe(false);
    expect(poster('Dark')).toBeTruthy();

    fireEvent.click(poster('Dark'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Add Dark to your watchlist' }),
    );

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: SIGN_IN_MESSAGE }),
    );
  });

  it('signed in: leaves out a pair the viewer has seen, once the library is known', async () => {
    signIn();
    vi.stubGlobal('fetch', library([2]));
    renderDeck();

    await waitFor(() => expect(poster('Silo')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Dark' })).toBeNull();
    // one pair left: nothing to step to
    expect(screen.queryByRole('button', { name: 'Another pair' })).toBeNull();
    const frame = document.querySelector('[data-slot="toy"]');
    expect(frame?.hasAttribute(SIGNED_OUT_ONLY)).toBe(false);
  });

  it('signed in: holds the card’s placeholder until the library is known', async () => {
    signIn();
    let answer: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            answer = resolve;
          }),
      ),
    );
    renderDeck();

    const frame = () => document.querySelector('[data-slot="toy"]');
    const ghost = () => document.querySelector('[data-placeholder="toy"]');
    // the pre-paint hint shows one of the two: the card signed out, the
    // placeholder signed in
    expect(frame()?.hasAttribute(SIGNED_OUT_ONLY)).toBe(true);
    expect(ghost()?.parentElement?.hasAttribute(SIGNED_IN_ONLY)).toBe(true);

    const card = frame();
    answer(
      new Response(
        JSON.stringify({
          favorites: [],
          inProgress: [],
          watched: [],
          watchlist: [],
        }),
      ),
    );
    await waitFor(() => expect(ghost()).toBeNull());
    expect(frame()?.hasAttribute(SIGNED_OUT_ONLY)).toBe(false);
    // the same card: shown, not remounted
    expect(frame()).toBe(card);
  });

  it('signed in: draws nothing when the viewer has seen a series of every pair', async () => {
    signIn();
    const fetch = library([1, 4]);
    vi.stubGlobal('fetch', fetch);
    renderDeck();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() =>
      expect(document.querySelector('[data-slot="toy"]')).toBeNull(),
    );
  });

  it('signed in: adding to the watchlist presses the button and keeps the pair', async () => {
    signIn();
    vi.stubGlobal('fetch', viewerFetch());
    renderDeck();
    await waitFor(() =>
      expect(
        document
          .querySelector('[data-slot="toy"]')
          ?.hasAttribute(SIGNED_OUT_ONLY),
      ).toBe(false),
    );

    fireEvent.click(poster('Dark'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Add Dark to your watchlist' }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove Dark from your watchlist' })
          .textContent,
      ).toBe('On watchlist'),
    );
    expect(poster('Dark').getAttribute('aria-pressed')).toBe('true');
  });
});
