// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import useShowQuery from './useShowQuery';

const { url } = vi.hoisted(() => ({
  url: { pathname: '', query: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => url.pathname,
  useSearchParams: () => url.query,
}));

const go = (pathname: string, query: string) => {
  url.pathname = pathname;
  url.query = new URLSearchParams(query);
};

describe('useShowQuery', () => {
  it('follows the URL while the show page is the one shown', () => {
    go('/136315/the-bear', 'season=1&episode=2');
    const { rerender, result } = renderHook(() => useShowQuery(136315));
    expect(result.current.get('episode')).toBe('2');
    go('/136315/the-bear', 'season=1');
    rerender();
    expect(result.current.has('episode')).toBe(false);
  });

  it('keeps its last query while the router shows another page (hidden in the back/forward cache)', () => {
    go('/136315/the-bear', 'season=1&episode=2');
    const { rerender, result } = renderHook(() => useShowQuery(136315));
    go('/person/17485/oliver-platt', '');
    rerender();
    expect(result.current.get('episode')).toBe('2');
    // another show's page is another page too
    go('/1396/breaking-bad', 'season=3');
    rerender();
    expect(result.current.get('season')).toBe('1');
    go('/136315/the-bear', 'season=1&episode=2');
    rerender();
    expect(result.current.get('episode')).toBe('2');
  });
});
