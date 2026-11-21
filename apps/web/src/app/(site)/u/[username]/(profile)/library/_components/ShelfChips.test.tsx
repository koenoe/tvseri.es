// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import type { LibraryCounts } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShelfChips } from './ShelfLinks';

const route = { pathname: '/u/koen/library/watching' };

vi.mock('next/navigation', () => ({
  usePathname: () => route.pathname,
}));

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

const COUNTS = {
  all: 9,
  favourites: 1,
  finished: 2,
  hidden: 0,
  paused: 1,
  stopped: 1,
  watching: 3,
  watchlist: 2,
} as unknown as LibraryCounts;

const animate = vi.fn();

beforeEach(() => {
  route.pathname = '/u/koen/library/watching';
  animate.mockReset();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: false,
      removeEventListener: () => undefined,
    })),
  );
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      return this.getAttribute('href')?.endsWith('finished') ? 200 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 80,
  });
  HTMLElement.prototype.animate = animate;
});

const chips = () => (
  <ShelfChips
    counts={COUNTS}
    defaultShelf="watching"
    owner={false}
    username="koen"
  />
);

const finished = () =>
  screen
    .getAllByRole('link')
    .find((link) => link.getAttribute('href')?.endsWith('finished'));

describe('the phone’s shelf chips', () => {
  it('draw the active shelf filled, in place', () => {
    render(chips());
    expect(animate).not.toHaveBeenCalled();
  });

  it('glide the fill from the open shelf to the one pressed', () => {
    const { rerender } = render(chips());
    fireEvent.click(finished() as HTMLElement);
    route.pathname = '/u/koen/library/finished';
    rerender(chips());
    const [frames, options] = animate.mock.calls[0] ?? [];
    expect((frames as Keyframe[])[0]?.transform).toBe(
      'translateX(-200px) scaleX(1)',
    );
    expect(options).toMatchObject({ pseudoElement: '::before' });
  });

  it('put the fill on its shelf after Back or Forward', () => {
    const { rerender } = render(chips());
    route.pathname = '/u/koen/library/finished';
    rerender(chips());
    expect(animate).not.toHaveBeenCalled();
  });
});
