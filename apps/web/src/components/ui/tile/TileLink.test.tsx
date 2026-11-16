// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import TileLink from './TileLink';
import { TILE_PREFETCH } from './tilePrefetch';

const { prefetch } = vi.hoisted(() => ({ prefetch: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ prefetch }) }));
// Next's Link without the router: the anchor, and its prefetch policy as data
vi.mock('next/link', () => ({
  default: ({
    children,
    prefetch: policy,
    ...rest
  }: Readonly<{ children?: ReactNode; prefetch?: unknown }>) => (
    <a data-prefetch={String(policy)} {...rest}>
      {children}
    </a>
  ),
}));

describe('TileLink', () => {
  it('prefetches in the viewport by default (TILE_PREFETCH)', () => {
    expect(TILE_PREFETCH).toBe('viewport');
    render(<TileLink href="/136315/the-bear">The Bear</TileLink>);
    // Next's own default (`auto`): the viewport prefetch
    expect(
      screen.getByRole('link', { name: 'The Bear' }).dataset.prefetch,
    ).toBe('undefined');
  });

  it('never prefetches in the viewport on intent', () => {
    prefetch.mockClear();
    render(
      <TileLink href="/136315/the-bear" prefetchOn="intent">
        The Bear
      </TileLink>,
    );
    expect(
      screen.getByRole('link', { name: 'The Bear' }).dataset.prefetch,
    ).toBe('false');
    expect(prefetch).not.toHaveBeenCalled();
  });

  it.each([
    ['a hover', fireEvent.mouseEnter],
    ['keyboard focus', fireEvent.focus],
    ['the first touch', fireEvent.pointerDown],
  ])('prefetches the page on %s, in either mode', (_, intent) => {
    prefetch.mockClear();
    render(
      <TileLink href="/136315/the-bear" prefetchOn="intent">
        The Bear
      </TileLink>,
    );
    intent(screen.getByRole('link', { name: 'The Bear' }));
    expect(prefetch).toHaveBeenCalledWith('/136315/the-bear');
  });

  it("still calls the caller's own handler", () => {
    const onFocus = vi.fn();
    render(
      <TileLink href="/136315/the-bear" onFocus={onFocus}>
        The Bear
      </TileLink>,
    );
    fireEvent.focus(screen.getByRole('link', { name: 'The Bear' }));
    expect(onFocus).toHaveBeenCalledOnce();
  });
});
