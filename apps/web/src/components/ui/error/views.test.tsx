// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';

import AppErrorView from './AppErrorView';
import { DataDownError } from './dataDown';
import ForbiddenView from './ForbiddenView';
import NotFoundView from './NotFoundView';
import type { NotFoundShow } from './notFoundShow';
import { NOT_FOUND_STILLS } from './stills';
import UnauthorizedView from './UnauthorizedView';

// the error pages draw the site header; its own tests cover it
vi.mock('@/components/header/Header', () => ({ default: () => null }));

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const SHOWS: NotFoundShow[] = [
  [225171, 'pluribus', 'Pluribus'],
  [250307, 'the-pitt', 'The Pitt'],
  [95480, 'slow-horses', 'Slow Horses'],
  [70523, 'dark', 'Dark'],
  [247767, 'the-studio', 'The Studio'],
  [1396, 'breaking-bad', 'Breaking Bad'],
].map(([id, slug, title]) => ({
  id: Number(id),
  poster: `https://image.tmdb.org/t/p/w300_and_h450_bestv2/${slug}.jpg`,
  slug: String(slug),
  title: String(title),
}));

const lost = NOT_FOUND_STILLS[0];

/** The 404's posters read the viewer's library (root layout's provider) */
const renderPage = (ui: ReactElement) =>
  render(ui, { wrapper: MarkingProvider });

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
}

describe('NotFoundView', () => {
  it('draws five trending posters and picks one of the whole pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    renderPage(<NotFoundView shows={SHOWS} still={lost} />);

    const start = screen.getByRole('region', {
      name: 'Or start something new',
    });
    const links = start.querySelectorAll('a');
    expect(links).toHaveLength(5);
    expect(links[0]?.getAttribute('href')).toBe('/225171/pluribus');

    fireEvent.click(screen.getByRole('button', { name: 'Pick one for me' }));
    expect(push).toHaveBeenCalledWith('/1396/breaking-bad');
  });

  it('leaves the pick and the posters out without trending shows', () => {
    renderPage(<NotFoundView still={lost} />);
    expect(
      screen.queryByRole('button', { name: 'Pick one for me' }),
    ).toBeNull();
    expect(screen.queryByText('Or start something new')).toBeNull();
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy();
  });

  it('offers to pick a series only with the button that does it', () => {
    const { unmount } = renderPage(<NotFoundView shows={SHOWS} still={lost} />);
    expect(screen.getByText(/let us pick a series for you/)).toBeTruthy();
    unmount();
    renderPage(<NotFoundView still={lost} />);
    expect(screen.queryByText(/pick a series/)).toBeNull();
    expect(
      screen.getByText(
        'The link is broken, or the page has gone. Search for it.',
      ),
    ).toBeTruthy();
  });
});

describe('ForbiddenView', () => {
  it('says it is for admins and offers Home', () => {
    render(<ForbiddenView />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'This one isn’t yours to open.',
      }),
    ).toBeTruthy();
    expect(screen.getByText('S04E03')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy();
  });
});

describe('AppErrorView', () => {
  const crash = Object.assign(new Error('boom'), { digest: '2734988123' });

  it('shows the 500 with the Error ID, and Try again retries', () => {
    setOnline(true);
    const retry = vi.fn();
    render(<AppErrorView error={crash} retry={retry} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '“Have you tried turning it off and on again?”',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText('Error ID 2734988123 · quote it if you write to us'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('shows data down for a DataDownError', () => {
    setOnline(true);
    render(<AppErrorView error={new DataDownError()} retry={vi.fn()} />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Our series data is on a break.',
      }),
    ).toBeTruthy();
    expect(screen.queryByText(/Error ID/)).toBeNull();
  });

  it('is off air while offline, and retries once the browser is back', () => {
    setOnline(false);
    const retry = vi.fn();
    render(<AppErrorView error={crash} retry={retry} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'You’re off air.' }),
    ).toBeTruthy();
    // the test card, no image
    expect(document.querySelector('img')).toBeNull();

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(retry).toHaveBeenCalledOnce();
  });
});

/** The view's root holds the rule that hides the footer and its air */
const hidesFooter = (container: HTMLElement) =>
  container.firstElementChild?.querySelector(':scope > style')?.textContent ===
  '[data-site-footer],[data-footer-air]{display:none}';

describe('the site footer under an error view', () => {
  it.each([
    ['404', () => <NotFoundView still={lost} />],
    ['401', () => <UnauthorizedView variant="default" />],
    ['403', () => <ForbiddenView />],
    ['500', () => <AppErrorView error={new Error('boom')} retry={vi.fn()} />],
    [
      'data down',
      () => <AppErrorView error={new DataDownError()} retry={vi.fn()} />,
    ],
  ])('the %s hides the footer with its own rule', (_, view) => {
    setOnline(true);
    const { container } = render(view());
    expect(hidesFooter(container)).toBe(true);
  });

  it('the offline view hides it too', () => {
    setOnline(false);
    const { container } = render(
      <AppErrorView error={new Error('boom')} retry={vi.fn()} />,
    );
    expect(hidesFooter(container)).toBe(true);
  });
});

describe('the error pages’ column', () => {
  it('lines up with the header’s page container at every width, not a fixed 112px', () => {
    render(<ForbiddenView />);
    const main = screen.getByRole('main');
    expect(main.className).toContain('max-w-page');
    expect(main.className).toContain('px-gutter');
    expect(main.className).not.toMatch(/\bmd:px-28\b/);
  });
});
