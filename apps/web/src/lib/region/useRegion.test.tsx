// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WIDE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import { useRegion } from './useRegion';

function Region({ name }: Readonly<{ name: string }>) {
  const region = useRegion();
  return <span data-testid={name}>{region ?? 'none'}</span>;
}

function Wide() {
  const wide = useMediaQuery(WIDE);
  return <span data-testid="wide">{wide ? 'wide' : 'narrow'}</span>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('useRegion', () => {
  it('asks for the region once, only when the wide query matches', async () => {
    let matches = false;
    let change = () => {};
    const added = vi.fn((_type: string, listener: () => void) => {
      change = listener;
    });
    const matchMedia = vi.fn((query: string) => ({
      addEventListener: added,
      get matches() {
        return matches;
      },
      media: query,
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMedia);
    const fetch = vi.fn(async () => Response.json({ region: 'GB' }));
    vi.stubGlobal('fetch', fetch);

    render(
      <>
        <Region name="a" />
        <Region name="b" />
        <Wide />
      </>,
    );
    // a phone never asks
    expect(fetch).not.toHaveBeenCalled();

    matches = true;
    await act(async () => {
      change();
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('a').textContent).toBe('GB');
    expect(screen.getByTestId('b').textContent).toBe('GB');
    expect(screen.getByTestId('wide').textContent).toBe('wide');
  });
});
