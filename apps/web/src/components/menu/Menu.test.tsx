// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { USER_DISPLAY_COOKIE_NAME as COOKIE } from '@/auth/cookies';
import { HeaderStoreProvider } from '@/components/header/HeaderStoreProvider';
import { OPEN_SEARCH_EVENT } from '@/lib/search/openSearch';
import { setCookie } from '@/test/setCookie';
import Menu from './Menu';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

// jsdom 31 has HTMLDialogElement but no show/showModal: the browser's part.
const show = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
const showModal = vi.fn();

let phone = false;

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  HTMLDialogElement.prototype.show = show;
  HTMLDialogElement.prototype.showModal = showModal;
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

// an open menu holds a history entry and closing it goes back over it (async
// in jsdom too): each Back is awaited (its popstate) before the next test sets
// its URL, rather than a fixed pause a loaded machine can outlast
let pendingBack: Promise<unknown> = Promise.resolve();
const goBack = History.prototype.back;

beforeEach(async () => {
  await pendingBack;
  vi.spyOn(window.history, 'back').mockImplementation(() => {
    pendingBack = Promise.race([
      new Promise((resolve) =>
        window.addEventListener('popstate', resolve, { once: true }),
      ),
      // a guard only: a Back with nowhere to go fires nothing
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    goBack.call(window.history);
  });
});

beforeEach(() => {
  phone = false;
  show.mockClear();
  // jsdom lays nothing out: every element counts as rendered for the focus loop
  vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(
    () => [{}] as unknown as DOMRectList,
  );
  window.history.replaceState(null, '', '/');
  vi.stubGlobal('matchMedia', (query: string) => ({
    addEventListener: () => {},
    matches: phone,
    media: query,
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  setCookie(`${COOKIE}=; path=/; max-age=0`);
  setCookie(`${LEFTOVER_ADMIN}=; path=/; max-age=0`);
  document.documentElement.style.overflow = '';
});

// the display-only flag an older version set for admins
const LEFTOVER_ADMIN = '__tvseries_admin';

const signIn = (username: string, leftoverAdmin = false) => {
  setCookie(`${COOKIE}=${encodeURIComponent(username)}; path=/`);
  if (leftoverAdmin) {
    setCookie(`${LEFTOVER_ADMIN}=1; path=/`);
  }
};

/** The header with the menu, the page and the footer beside it, as on the site */
const renderMenu = () =>
  render(
    <HeaderStoreProvider>
      <div>
        <header>
          <a href="/">tvseri.es home</a>
          <Menu />
        </header>
        <main>
          <a href="/page">A link on the page</a>
        </main>
        <footer>Footer</footer>
      </div>
    </HeaderStoreProvider>,
  );

const menuButton = () => screen.getByRole('button', { name: 'Menu' });
const dialog = () => screen.getByRole('dialog', { name: 'Menu' });
const words = () =>
  within(dialog())
    .getAllByRole('listitem')
    .map((item) => item.textContent);

const open = async () => {
  await userEvent.click(menuButton());
  return dialog();
};

describe('the menu', () => {
  it('signed in: Watch, You · @handle with five pages, the account line; no Circle, no icons', async () => {
    signIn('margaux');
    renderMenu();
    const menu = await open();

    expect(words()).toEqual([
      'Home',
      'Discover',
      'Overview',
      'Calendar',
      'Library',
      'History',
      'Stats',
      'Settings',
      'Sign out',
    ]);
    expect(menu.textContent).toContain('Watch');
    expect(menu.textContent).toContain('You · @margaux');
    expect(menu.querySelectorAll('svg')).toHaveLength(0);
    expect(
      within(menu).getByRole('link', { name: 'Library' }).getAttribute('href'),
    ).toBe('/u/margaux/library');
    const signOut = within(menu).getByRole('button', { name: 'Sign out' });
    expect(signOut.closest('form')?.getAttribute('action')).toBe(
      '/api/auth/logout',
    );
    expect(signOut.closest('form')?.getAttribute('method')).toBe('post');
  });

  it('signed out: Home, Discover and Sign in with its note', async () => {
    renderMenu();
    const menu = await open();

    expect(words()).toEqual(['Home', 'Discover', 'Sign in']);
    expect(menu.textContent).toContain('An email code or Google. No password.');
    expect(menu.textContent).not.toContain('Sign out');
  });

  it('shows no Dashboard, even with an admin flag left over from before', async () => {
    signIn('margaux', true);
    renderMenu();
    const menu = await open();
    expect(words()).not.toContain('Dashboard');
    expect(within(menu).queryByRole('link', { name: 'Dashboard' })).toBeNull();
  });

  it('marks the current page, by prefix on profile pages', async () => {
    signIn('margaux');
    window.history.replaceState(null, '', '/u/margaux/library/watchlist');
    renderMenu();
    const menu = await open();

    const current = menu.querySelectorAll('[aria-current="page"]');
    expect([...current].map((element) => element.textContent)).toEqual([
      'Library',
    ]);
  });

  it('lowercases the words by CSS only, so their names stay as written', async () => {
    signIn('margaux');
    renderMenu();
    const menu = await open();
    const home = within(menu).getByRole('link', { name: 'Home' });
    expect(home.textContent).toBe('Home');
    expect(home.className).toContain('lowercase');
  });

  it('has the blur fallback on its glass', async () => {
    renderMenu();
    const menu = await open();
    const panel = menu.querySelector('[data-menu-panel]');
    // regression: iPhones keep the blur; without it the glass is a 94% tint
    expect(panel?.className).toContain('backdrop-blur-[20px]');
    expect(panel?.className).toContain(
      '[html[data-flat-glass]_&]:backdrop-filter-none',
    );
    expect(panel?.className).toContain(
      '[html[data-flat-glass]_&]:bg-[linear-gradient(rgb(255_255_255/0.05),rgb(255_255_255/0.05)),linear-gradient(rgb(17_19_20/0.94)',
    );
  });
});

describe('the menu is a non-modal dialog', () => {
  it('opens with show(), not showModal(), and makes the page inert, never the header', async () => {
    signIn('margaux');
    renderMenu();
    await open();

    expect(show).toHaveBeenCalledOnce();
    expect(showModal).not.toHaveBeenCalled();
    expect(document.querySelector('main')?.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('footer')?.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('header')?.hasAttribute('inert')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('keeps the username clickable while open; following it closes the menu', async () => {
    signIn('margaux');
    renderMenu();
    await open();

    const username = screen.getByRole('link', { name: 'margaux' });
    expect(username.closest('[inert]')).toBeNull();
    await userEvent.click(username);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.querySelector('main')?.hasAttribute('inert')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('keeps Sign in clickable while open', async () => {
    renderMenu();
    await open();

    const signInLink = within(
      document.querySelector('header') as HTMLElement,
    ).getByRole('link', { name: 'Sign in' });
    expect(signInLink.closest('[inert]')).toBeNull();
    await userEvent.click(signInLink);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opened by a click, focus goes to the menu itself', async () => {
    renderMenu();
    const menu = await open();
    expect(document.activeElement).toBe(menu);
  });

  it('opened from the keyboard, focus goes to the first word; Escape closes and returns focus', async () => {
    signIn('margaux');
    renderMenu();

    menuButton().focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialog()).getByRole('link', { name: 'Home' }),
      ),
    );

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(menuButton());
  });

  it('cycles focus through the header and the menu together', async () => {
    signIn('margaux');
    renderMenu();
    menuButton().focus();
    await userEvent.keyboard('{Enter}');
    const menu = dialog();
    const signOut = within(menu).getByRole('button', { name: 'Sign out' });
    const logo = screen.getByRole('link', { name: 'tvseri.es home' });

    signOut.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(logo);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(signOut);
  });

  it('closes on a click outside the words and returns focus to the toggle', async () => {
    renderMenu();
    const menu = await open();
    const dim = menu.querySelector<HTMLElement>('[data-menu-dim]');
    expect(dim).not.toBeNull();
    await userEvent.click(dim as HTMLElement);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(menuButton());
  });

  it('closes when a destination is followed', async () => {
    renderMenu();
    const menu = await open();
    await userEvent.click(within(menu).getByRole('link', { name: 'Discover' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Back, over the history entry it holds while open', async () => {
    renderMenu();
    await open();
    window.history.back();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('leaves an Escape meant for another open dialog alone', async () => {
    renderMenu();
    await open();

    const other = document.createElement('dialog');
    other.setAttribute('open', '');
    const field = document.createElement('input');
    other.append(field);
    document.body.append(other);
    try {
      field.focus();
      await userEvent.keyboard('{Escape}');
      expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy();
    } finally {
      other.remove();
    }
  });

  it('hands over to search: the menu closes and search opens from the header button', async () => {
    renderMenu();
    await open();
    const listener = vi.fn();
    window.addEventListener(OPEN_SEARCH_EVENT, listener);

    const search = screen.getByRole('button', { name: 'Search' });
    expect(search.closest('[inert]')).toBeNull();
    await userEvent.click(search);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].detail.trigger).toBe(search);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // focus stays where search put it, not back on the toggle
    expect(document.activeElement).toBe(search);
    window.removeEventListener(OPEN_SEARCH_EVENT, listener);
  });
});

describe('the phone menu', () => {
  it('spreads the glass over the screen; a tap on it closes the menu', async () => {
    phone = true;
    signIn('margaux');
    renderMenu();
    const menu = await open();

    expect(menu.querySelector('[data-menu-panel]')).toBeNull();
    const glass = menu.querySelector<HTMLElement>('[data-menu-glass]');
    await userEvent.click(glass as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
