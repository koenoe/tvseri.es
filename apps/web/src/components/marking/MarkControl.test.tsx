// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { forgetViewer } from '@/components/menu/displayCookie';
import type { ControlState, ControlStates } from '@/lib/marking/controlState';
import { SIGN_IN_MESSAGE } from '@/lib/marking/copy';
import MarkingProvider from '@/lib/marking/MarkingProvider';
import { viewerFetch } from '@/lib/marking/testing/viewerFetch';
import { setCookie } from '@/test/setCookie';
import MarkControl from './MarkControl';
import type { MarkLook } from './markControlStyles';

const showToast = vi.fn();
vi.mock('@/components/ui/toast/showToast', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));
// writes are held: the marks stay optimistic, as on a slow network
vi.mock(import('@/lib/marking/actions'), async (importOriginal) => ({
  ...(await importOriginal()),
  markScope: () => new Promise(() => {}),
  setInList: () => new Promise(() => {}),
}));

const SHOW = {
  href: '/7/the-pitt',
  id: 7,
  seasons: '2 seasons',
  title: 'The Pitt',
};

const renderControl = async (
  state: ControlState | null,
  look: MarkLook = 'spotlight',
) => {
  const states = Promise.resolve<ControlStates | null>(
    state ? { [SHOW.id]: state } : null,
  );
  // the state streams in: render, then let the read resolve
  let view: ReturnType<typeof render> | undefined;
  await act(async () => {
    view = render(
      <MarkingProvider>
        <MarkControl look={look} show={SHOW} states={states} />
      </MarkingProvider>,
    );
  });
  if (!view) {
    throw new Error('not rendered');
  }
  return view;
};

const row = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-mark-control]');
const layerOf = (container: HTMLElement, name: 'pair' | 'single') =>
  container.querySelector<HTMLElement>(`[data-layer="${name}"]`);
const shown = (element: HTMLElement | null) =>
  element !== null && !element.className.includes('invisible');

const signIn = () => {
  setCookie('__tvseries_user=nina; Path=/');
};

beforeEach(() => {
  forgetViewer();
});

afterEach(() => {
  vi.unstubAllGlobals();
  showToast.mockReset();
});

describe('MarkControl: the pair, or one button in the viewer’s state', () => {
  it('signed out: the pair, and a press asks to sign in', async () => {
    const { container } = await renderControl(null);
    expect(row(container)?.dataset.markControl).toBe('new');
    // Signed out, the pair is in the static shell: nothing streams in to fade
    expect(row(container)?.className).not.toContain('starting:opacity-0');
    fireEvent.click(
      screen.getByRole('button', { name: 'Add The Pitt to your watchlist' }),
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: SIGN_IN_MESSAGE }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Mark The Pitt as seen' }),
    );
    expect(showToast).toHaveBeenCalledTimes(2);
  });

  it('new to you: "+ Watchlist" and "Seen it"', async () => {
    const { container } = await renderControl({
      kind: 'new',
      onWatchlist: false,
    });
    const add = screen.getByRole('button', {
      name: 'Add The Pitt to your watchlist',
    });
    expect(add.textContent).toBe('Watchlist');
    expect(
      screen.getByRole('button', { name: 'Mark The Pitt as seen' }),
    ).toBeTruthy();
    expect(shown(layerOf(container, 'pair'))).toBe(true);
    expect(layerOf(container, 'single')).toBeNull();
    // The viewer's state streams in, so it fades in rather than popping
    expect(row(container)?.className).toContain('starting:opacity-0');
  });

  it('on the watchlist: one pressed button, over the pair that sizes the row', async () => {
    const { container } = await renderControl({
      kind: 'watchlist',
      onWatchlist: true,
    });
    const button = screen.getByRole('button', {
      name: 'Remove The Pitt from your watchlist',
    });
    expect(button.textContent).toBe('On watchlist');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(shown(layerOf(container, 'single'))).toBe(true);
    // the pair stays laid out, unseen: the row keeps its width
    expect(layerOf(container, 'pair')?.className).toContain('invisible');
  });

  it('watching: Continue S02E04 with the season’s count, opening the episode', async () => {
    await renderControl({
      kind: 'watching',
      next: { episodeNumber: 4, seasonNumber: 2 },
      onWatchlist: false,
      seasonTotal: 15,
      seasonWatched: 3,
    });
    const link = screen.getByRole('link', { name: /Continue S02E04/ });
    expect(link.getAttribute('href')).toBe('/7/the-pitt?season=2&episode=4');
    expect(link.textContent).toBe('Continue S02E043 of 15');
  });

  it('a press on + Watchlist crossfades to On watchlist; Undo crossfades back', async () => {
    signIn();
    vi.stubGlobal('fetch', viewerFetch());
    const { container } = await renderControl({
      kind: 'new',
      onWatchlist: false,
    });
    const add = screen.getByRole('button', {
      name: 'Add The Pitt to your watchlist',
    });
    add.focus();
    fireEvent.click(add);
    const remove = await screen.findByRole('button', {
      name: 'Remove The Pitt from your watchlist',
    });
    expect(shown(layerOf(container, 'single'))).toBe(true);
    expect(shown(layerOf(container, 'pair'))).toBe(false);
    // focus follows the press to the button that took its place
    expect(document.activeElement).toBe(remove);
    const undo = showToast.mock.calls
      .map(([toast]) => toast as { action?: { onClick: () => void } })
      .find((toast) => toast.action)?.action;
    act(() => undo?.onClick());
    expect(shown(layerOf(container, 'pair'))).toBe(true);
    expect(row(container)?.dataset.markControl).toBe('new');
  });

  it('a press on Seen it crossfades to Finished', async () => {
    signIn();
    vi.stubGlobal('fetch', viewerFetch());
    const { container } = await renderControl({
      kind: 'new',
      onWatchlist: false,
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Mark The Pitt as seen' }),
    );
    expect(await screen.findByRole('link', { name: /Finished/ })).toBeTruthy();
    expect(row(container)?.dataset.markControl).toBe('finished');
  });
});
