// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PHONE } from './breakpoints';
import useMediaQuery from './useMediaQuery';

function Reader({ name }: Readonly<{ name: string }>) {
  const phone = useMediaQuery(PHONE);
  return <span data-testid={name}>{phone ? 'phone' : 'wide'}</span>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('every reader of a query shares one MediaQueryList and one listener, and follows a change', () => {
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

    render(
      <>
        <Reader name="a" />
        <Reader name="b" />
        <Reader name="c" />
      </>,
    );
    expect(matchMedia).toHaveBeenCalledTimes(1);
    expect(added).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('a').textContent).toBe('wide');

    act(() => {
      matches = true;
      change();
    });
    expect(
      ['a', 'b', 'c'].map((name) => screen.getByTestId(name).textContent),
    ).toEqual(['phone', 'phone', 'phone']);
  });
});
