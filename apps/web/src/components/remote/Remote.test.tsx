// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { PHONE } from '@/lib/media/breakpoints';
import { remoteInk } from '@/lib/remote/ink';

import { createFakeMarking } from './fakeMarking';
import { RemoteMarkingProvider, type UseRemoteMarking } from './marking';
import ShowRemote from './ShowRemote';
import TileRemote from './TileRemote';
import type { RemoteEpisode, RemoteSection } from './types';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: Readonly<{ children: ReactNode; href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  // jsdom hides [popover] and can't show one: stand in for the browser's part
  HTMLElement.prototype.showPopover = function showPopover() {
    this.removeAttribute('popover');
  };
  HTMLElement.prototype.hidePopover = () => {};
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const BEAR: ReadonlyArray<RemoteEpisode> = [
  { episodeNumber: 5, seasonNumber: 3, still: null, title: 'Children' },
  { episodeNumber: 6, seasonNumber: 3, still: null, title: 'Napkins' },
];

const fake = (overrides: Partial<Parameters<typeof createFakeMarking>[0]>) =>
  createFakeMarking({
    lastEpisode: 10,
    nextEpisode: { episodeNumber: 5, seasonNumber: 3 },
    status: { isFavorited: false, isWatchlisted: false },
    ...overrides,
  });

function renderShow(
  adapter: UseRemoteMarking,
  extraSection?: RemoteSection,
  hasAired = true,
) {
  return render(
    <RemoteMarkingProvider value={adapter}>
      <ShowRemote
        episodes={BEAR}
        extraSection={extraSection}
        hasAired={hasAired}
        historyHref="/136315/the-bear?history"
        nextToAir={{ airDate: null, episodeNumber: 1, seasonNumber: 4 }}
        seriesId={136315}
        seriesName="The Bear"
      />
      <button type="button">Elsewhere</button>
    </RemoteMarkingProvider>,
  );
}

const trigger = () =>
  screen.getByRole('button', { name: 'More actions for The Bear' });
const keysOf = () => Array.from(document.querySelectorAll('[data-remote-key]'));
const closed = () =>
  waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
const flush = () => act(() => Promise.resolve());

describe('ShowRemote', () => {
  it('opens on a click with the episode the big key will mark and the letters', async () => {
    renderShow(fake({}));
    await userEvent.click(trigger());
    const menu = screen.getByRole('menu', { name: 'Actions for The Bear' });
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(menu.id);
    const big = screen.getByRole('menuitem', { name: /Watched next episode/ });
    expect(big.textContent).toContain('S03E05 · Children');
    expect(big.getAttribute('aria-keyshortcuts')).toBe('N');
    expect(
      keysOf().map((key) => key.getAttribute('aria-keyshortcuts')),
    ).toEqual(['N', 'E', 'F', 'W']);
    expect(screen.getByText('Press a letter · Esc closes')).toBeTruthy();
    await flush();
    expect(document.activeElement).toBe(menu);
  });

  it('Enter on the ⋯ focuses the big key; arrows move; Escape closes and returns focus', async () => {
    renderShow(fake({}));
    trigger().focus();
    await userEvent.keyboard('{Enter}');
    await flush();
    const big = screen.getByRole('menuitem', { name: /Watched next episode/ });
    expect(document.activeElement).toBe(big);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemcheckbox', { name: /Add to favourites/ }),
    );
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(big);
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(document.activeElement).toBe(trigger());
  });

  it('↓ on the ⋯ opens it too', async () => {
    renderShow(fake({}));
    trigger().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('F latches favourites and stays open; the ring shows while the server answers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderShow(fake({ delayMs: () => 900 }));
    await userEvent.click(trigger());
    await flush();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'f' });
    const favorites = screen.getByRole('menuitemcheckbox', {
      name: /Remove from favourites/,
    });
    expect(favorites.getAttribute('aria-checked')).toBe('true');
    expect(favorites.getAttribute('aria-busy')).toBe('true');
    expect(document.activeElement).toBe(favorites);
    await act(() => vi.advanceTimersByTimeAsync(900));
    expect(favorites.hasAttribute('aria-busy')).toBe(false);
    expect(screen.getByRole('menu')).toBeTruthy();
    vi.useRealTimers();
  });

  it('N marks the next episode, then closes; the big key has moved on when it reopens', async () => {
    renderShow(fake({}));
    trigger().focus();
    await userEvent.keyboard('{Enter}');
    await flush();
    await userEvent.keyboard('n');
    await flush();
    await closed();
    expect(document.activeElement).toBe(trigger());
    await userEvent.click(trigger());
    expect(
      screen.getByRole('menuitem', { name: /Watched next episode/ })
        .textContent,
    ).toContain('S03E06 · Napkins');
  });

  it('says “Marking S03E05…” while a slow mark is pending', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderShow(fake({ delayMs: () => 900 }));
    await userEvent.click(trigger());
    await flush();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'N' });
    const big = screen.getByRole('menuitem', { name: /Marking S03E05…/ });
    expect(big.getAttribute('aria-busy')).toBe('true');
    // other keys stay usable
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'w' });
    expect(
      screen.getByRole('menuitemcheckbox', { name: /Remove from watchlist/ }),
    ).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(900));
    await closed();
    vi.useRealTimers();
  });

  it('a caught-up show disables the big key with its reason; N does nothing', async () => {
    const markNext = vi.fn();
    const adapter = fake({ nextEpisode: null });
    const spy: UseRemoteMarking = (id) => ({ ...adapter(id), markNext });
    renderShow(spy);
    await userEvent.click(trigger());
    const big = screen.getByRole('menuitem', { name: /Watched next episode/ });
    expect(big.getAttribute('aria-disabled')).toBe('true');
    expect(big.textContent).toContain(
      'All caught up · Season 4 has no date yet',
    );
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'n' });
    expect(markNext).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(document.activeElement).toBe(big);
  });

  it('Edit watch history is a link to the sheet that closes the Remote', async () => {
    renderShow(fake({}));
    await userEvent.click(trigger());
    const history = screen.getByRole('menuitem', {
      name: /Edit watch history/,
    });
    expect(history.getAttribute('href')).toBe('/136315/the-bear?history');
    fireEvent.click(history);
    await closed();
  });

  it('a click outside, Tab and the ⋯ again close it', async () => {
    renderShow(fake({}));
    await userEvent.click(trigger());
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));
    await closed();
    await userEvent.click(trigger());
    await userEvent.click(trigger());
    await closed();
    await userEvent.click(trigger());
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    await closed();
  });

  it('draws the extra section (Admin) after a rule, in the grid and the letters', async () => {
    const select = vi.fn();
    const icon = { outline: <path d="M0 0" /> };
    renderShow(fake({}), {
      keys: [
        {
          icon,
          id: 'hero',
          label: 'Hero images',
          letter: 'I',
          meta: '1 backdrop, no logos: nothing to choose',
          onSelect: select,
        },
        {
          external: true,
          href: 'https://www.themoviedb.org/tv/136315/images/backdrops',
          icon,
          id: 'tmdb',
          label: 'Images on TMDB',
          letter: 'T',
        },
      ],
      note: 'Only you see these',
      title: 'Admin',
    });
    trigger().focus();
    await userEvent.keyboard('{Enter}');
    await flush();
    const admin = screen.getByRole('group', { name: 'Admin' });
    // the note reaches screen readers as the group's description
    expect(
      document.getElementById(admin.getAttribute('aria-describedby') ?? '')
        ?.textContent,
    ).toBe('Only you see these');
    await userEvent.keyboard('{ArrowDown}{ArrowRight}{ArrowRight}{ArrowDown}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: /Images on TMDB/ }),
    );
    await userEvent.keyboard('i');
    expect(select).toHaveBeenCalledOnce();
    await closed();
  });

  it('opens the history sheet in place when the page passes onEditHistory', async () => {
    const openHistory = vi.fn();
    render(
      <RemoteMarkingProvider value={fake({})}>
        <ShowRemote
          hasAired
          historyHref="/136315/the-bear?history"
          onEditHistory={openHistory}
          seriesId={136315}
          seriesName="The Bear"
        />
      </RemoteMarkingProvider>,
    );
    await userEvent.click(trigger());
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'e' });
    expect(openHistory).toHaveBeenCalledOnce();
    await closed();
  });
});

describe('a mark still on its way when the Remote closes', () => {
  /** An adapter whose mark the test settles by hand (an unseeded tile). */
  function slowAdapter() {
    let settle: () => void = () => {};
    const markNext = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        }),
    );
    const adapter: UseRemoteMarking = () => ({
      hide: () => {},
      listPending: { favorites: false, watchlist: false },
      markNext,
      nextEpisode: { episodeNumber: 5, seasonNumber: 3 },
      status: { isFavorited: false, isWatchlisted: false },
      toggleList: () => {},
    });
    return { adapter, markNext, settle: () => settle() };
  }

  it('reopened, the big key is still pending and N does not mark again', async () => {
    const { adapter, markNext, settle } = slowAdapter();
    renderShow(adapter);
    await userEvent.click(trigger());
    await flush();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'N' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await closed();

    await userEvent.click(trigger());
    await flush();
    expect(
      screen.getByRole('menuitem', { name: /Marking S03E05…/ }),
    ).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'N' });
    expect(markNext).toHaveBeenCalledOnce();

    await act(async () => settle());
  });

  it('the first mark settling does not close the Remote opened since', async () => {
    const { adapter, settle } = slowAdapter();
    renderShow(adapter);
    await userEvent.click(trigger());
    await flush();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'N' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await closed();
    await userEvent.click(trigger());
    await flush();

    await act(async () => settle());
    await flush();
    expect(screen.getByRole('menu')).toBeTruthy();
  });
});

describe('the popover on scroll', () => {
  it('re-places itself at most once a frame, however many scroll events come', async () => {
    renderShow(fake({}));
    await userEvent.click(trigger());
    await flush();
    const rect = vi.spyOn(trigger(), 'getBoundingClientRect');
    const frames: FrameRequestCallback[] = [];
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });

    for (let i = 0; i < 5; i += 1) {
      window.dispatchEvent(new Event('scroll'));
    }
    expect(rect).not.toHaveBeenCalled();
    for (const frame of frames.splice(0)) {
      frame(0);
    }
    expect(rect).toHaveBeenCalledOnce();

    raf.mockRestore();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await closed();
  });
});

describe('TileRemote', () => {
  it('has N, E and H; H hides the tile and closes', async () => {
    const onHide = vi.fn();
    render(
      <RemoteMarkingProvider value={fake({})}>
        <TileRemote
          episodes={BEAR}
          historyHref="/136315/the-bear?season=3&history"
          ink="#29251f"
          onHide={onHide}
          seriesId={136315}
          seriesName="The Bear"
        />
      </RemoteMarkingProvider>,
    );
    await userEvent.click(trigger());
    expect(
      keysOf().map((key) => key.getAttribute('aria-keyshortcuts')),
    ).toEqual(['N', 'E', 'H']);
    expect(screen.getByRole('menu').style.getPropertyValue('--rk-ink')).toBe(
      '#29251f',
    );
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'h' });
    expect(onHide).toHaveBeenCalledOnce();
    await closed();
  });
});

describe('TileRemote on a hidden show', () => {
  it('latches H, and H brings the show back', async () => {
    const onHide = vi.fn();
    const onRestore = vi.fn();
    const hidden = vi.fn();
    render(
      <RemoteMarkingProvider value={fake({ onHide: hidden, onRestore })}>
        <TileRemote
          episodes={BEAR}
          hidden
          historyHref="/136315/the-bear?season=3&history"
          onHide={onHide}
          seriesId={136315}
          seriesName="The Bear"
        />
      </RemoteMarkingProvider>,
    );
    await userEvent.click(trigger());
    const h = screen.getByRole('menuitemcheckbox', {
      name: /Hidden from in progress/,
    });
    expect(h.getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'h' });
    expect(onRestore).toHaveBeenCalledOnce();
    expect(hidden).not.toHaveBeenCalled();
    expect(onHide).toHaveBeenCalledOnce();
    await closed();
  });
});

describe('ink (WCAG AA on any page colour)', () => {
  it('darkens a light tile colour until every step reads', async () => {
    render(
      <RemoteMarkingProvider value={fake({})}>
        <TileRemote
          episodes={BEAR}
          historyHref="/136315/the-bear?season=3&history"
          ink="#8a6d3b"
          seriesId={136315}
          seriesName="The Bear"
        />
      </RemoteMarkingProvider>,
    );
    await userEvent.click(trigger());
    expect(screen.getByRole('menu').style.getPropertyValue('--rk-ink')).toBe(
      remoteInk('#8a6d3b'),
    );
    expect(remoteInk('#8a6d3b')).not.toBe('#8a6d3b');
  });

  it('takes the page colour when no ink is given, darkened the same way', async () => {
    document.documentElement.style.setProperty(
      '--main-background-color',
      '#767676',
    );
    try {
      renderShow(fake({}));
      await userEvent.click(trigger());
      expect(screen.getByRole('menu').style.getPropertyValue('--rk-ink')).toBe(
        remoteInk('#767676'),
      );
    } finally {
      document.documentElement.style.removeProperty('--main-background-color');
    }
  });
});

describe('on phones', () => {
  it('opens as a modal sheet without letter chips or the hint', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      addEventListener: () => {},
      matches: query === PHONE,
      removeEventListener: () => {},
    }));
    renderShow(fake({}));
    await userEvent.click(trigger());
    const sheet = screen.getByRole('dialog', { name: 'Actions for The Bear' });
    expect(sheet.hasAttribute('open')).toBe(true);
    expect(screen.getByRole('menu').getAttribute('data-layout')).toBe('sheet');
    expect(screen.queryByText('Press a letter · Esc closes')).toBeNull();
    expect(
      screen.getByRole('menuitem', { name: /Watched next episode/ })
        .textContent,
    ).not.toMatch(/N$/);
  });
});
