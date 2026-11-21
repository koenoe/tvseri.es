// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PrefetchProvider from '@/lib/navigation/PrefetchProvider';
import { HOVER_INTENT_MS, resetIntents } from '@/lib/navigation/useLinkIntent';

import { countFetch, PREFETCH_FETCH_LIMIT } from './prefetchBudget';
import TileLink from './TileLink';

const { prefetch, preloadImage } = vi.hoisted(() => ({
  prefetch: vi.fn(),
  preloadImage: vi.fn(() => Promise.resolve('')),
}));
vi.mock('@/components/background/preloadImage', () => ({
  default: preloadImage,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ prefetch }) }));
// Next's Link without the router: the anchor, and its prefetch policy as data
vi.mock('next/link', () => ({
  default: ({
    children,
    prefetch: policy,
    ...rest
  }: Readonly<{
    children?: ReactNode;
    prefetch?: unknown;
  }>) => (
    <a data-prefetch={String(policy)} {...rest}>
      {children}
    </a>
  ),
}));

// the router's prefetch reaches tiles through the root layout's provider
const wrapper = PrefetchProvider;

describe('TileLink', () => {
  it('prefetches in the viewport by default', () => {
    render(<TileLink href="/136315/the-bear">The Bear</TileLink>, { wrapper });
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
      { wrapper },
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
      { wrapper },
    );
    intent(screen.getByRole('link', { name: 'The Bear' }));
    expect(prefetch).toHaveBeenCalledWith('/136315/the-bear');
  });

  describe('a show opens whole', () => {
    const show = () => screen.getByRole('link', { name: 'The Bear' });
    const renderShow = (href = '/136315/the-bear') =>
      render(
        <TileLink backdrop="/bear.jpg" href={href}>
          The Bear
        </TileLink>,
        { wrapper },
      );
    const rest = (link: HTMLElement) => {
      fireEvent.pointerEnter(link, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(HOVER_INTENT_MS));
    };

    beforeEach(() => {
      vi.useFakeTimers();
      preloadImage.mockClear();
      resetIntents();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('asks for the whole page once a mouse rests on it', () => {
      renderShow();
      fireEvent.pointerEnter(show(), { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(HOVER_INTENT_MS - 1));
      expect(show().dataset.prefetch).toBe('undefined');
      act(() => vi.advanceTimersByTime(1));
      expect(show().dataset.prefetch).toBe('true');
    });

    it('on keyboard focus at once', () => {
      renderShow();
      act(() => show().focus());
      expect(show().dataset.prefetch).toBe('true');
    });

    it('not for a mouse passing over it, nor for a tap', () => {
      renderShow();
      fireEvent.pointerEnter(show(), { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(40));
      fireEvent.pointerLeave(show());
      fireEvent.pointerEnter(show(), { pointerType: 'touch' });
      fireEvent.pointerDown(show(), { pointerType: 'touch' });
      act(() => show().focus());
      fireEvent.pointerUp(show(), { pointerType: 'touch' });
      act(() => vi.advanceTimersByTime(500));
      expect(show().dataset.prefetch).toBe('undefined');
      expect(preloadImage).not.toHaveBeenCalled();
    });

    it('drops back once the pointer leaves (a refresh re-runs a per-link prefetch)', () => {
      renderShow();
      rest(show());
      fireEvent.pointerLeave(show());
      expect(show().dataset.prefetch).toBe('undefined');
    });

    // a reused link (a carousel's slide, a card kept per show)
    it('only for the href it was pointed at', () => {
      const { rerender } = renderShow();
      rest(show());
      rerender(
        <TileLink
          backdrop="/bear.jpg"
          href="/136315/the-bear?season=1&episode=2"
        >
          The Bear
        </TileLink>,
      );
      expect(show().dataset.prefetch).toBe('undefined');
    });

    // the per-link prefetch is itself a fetch the budget counts
    it('keeps the whole page asked for once the prefetch budget runs out', () => {
      const href = '/990077/budget-show';
      renderShow(href);
      rest(show());
      expect(show().dataset.prefetch).toBe('true');
      act(() => {
        for (let fetch = 0; fetch < PREFETCH_FETCH_LIMIT; fetch++) {
          countFetch(`${href}?_rsc=${fetch}`, 'fetch', window.location);
        }
      });
      expect(show().dataset.prefetch).toBe('true');
    });

    // On Vercel a show without its own prerender answers its static prefetch
    // with the route's fallback shell, which Next re-requests every 2s: the
    // budget runs out before any hover, and the click showed the skeleton
    it('still opens whole on a first intent once the prefetch budget ran out', () => {
      const href = '/990078/fallback-show';
      act(() => {
        for (let fetch = 0; fetch < PREFETCH_FETCH_LIMIT; fetch++) {
          countFetch(`${href}?_rsc=${fetch}`, 'fetch', window.location);
        }
      });
      renderShow(href);
      expect(show().dataset.prefetch).toBe('false');
      rest(show());
      expect(show().dataset.prefetch).toBe('true');
    });

    it("decodes the page's backdrop once per page per session", () => {
      renderShow();
      rest(show());
      fireEvent.pointerLeave(show());
      rest(show());
      renderShow();
      rest(screen.getAllByRole('link')[1] as HTMLElement);
      expect(preloadImage).toHaveBeenCalledOnce();
      expect(preloadImage).toHaveBeenCalledWith(
        expect.stringContaining('bear.jpg'),
        expect.objectContaining({ sizes: '100vw' }),
      );
    });

    it('keeps a person page to its shell', () => {
      render(
        <TileLink href="/person/17419/bryan-cranston" prefetchOn="intent">
          Bryan Cranston
        </TileLink>,
        { wrapper },
      );
      const person = screen.getByRole('link', { name: 'Bryan Cranston' });
      fireEvent.focus(person);
      rest(person);
      expect(person.dataset.prefetch).toBe('false');
      expect(prefetch).toHaveBeenCalledWith('/person/17419/bryan-cranston');
    });

    it('tells the place when the show is warmed', () => {
      const onIntent = vi.fn();
      render(
        <TileLink href="/136315/the-bear" onIntent={onIntent}>
          The Bear
        </TileLink>,
        { wrapper },
      );
      rest(show());
      expect(onIntent).toHaveBeenCalledOnce();
    });

    // search: only its arrows count, never a hover
    it('the place may decide instead of the pointer', () => {
      const { rerender } = render(
        <TileLink href="/136315/the-bear" opensWhole={false}>
          The Bear
        </TileLink>,
        { wrapper },
      );
      rest(show());
      act(() => show().focus());
      expect(show().dataset.prefetch).toBe('undefined');
      rerender(
        <TileLink href="/136315/the-bear" opensWhole>
          The Bear
        </TileLink>,
      );
      expect(show().dataset.prefetch).toBe('true');
    });
  });

  it("still calls the caller's own handler", () => {
    const onFocus = vi.fn();
    render(
      <TileLink href="/136315/the-bear" onFocus={onFocus}>
        The Bear
      </TileLink>,
      { wrapper },
    );
    fireEvent.focus(screen.getByRole('link', { name: 'The Bear' }));
    expect(onFocus).toHaveBeenCalledOnce();
  });
});
