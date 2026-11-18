// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REDUCED_MOTION, WIDE_LG } from '@/lib/media/breakpoints';
import type { RollBlock } from '@/lib/series/episodeCredits';
import CreditsRoll from './CreditsRoll';

/** Every render of the list's second copy (the roll's loop) */
const copies = vi.hoisted(() => ({ rendered: 0 }));

vi.mock('./CreditBlocks', () => ({
  default: ({ copy }: Readonly<{ copy?: boolean }>) => {
    if (copy) {
      copies.rendered += 1;
    }
    return <div data-testid={copy ? 'copy' : 'list'} />;
  },
}));

const BLOCKS: ReadonlyArray<RollBlock> = [
  {
    kind: 'names',
    people: [{ id: 1, name: 'Christopher Storer', slug: 'christopher-storer' }],
    role: 'Directed by',
  },
];

/** `matchMedia` answering the given queries as matching */
const media = (...matching: ReadonlyArray<string>) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    addEventListener: () => {},
    matches: matching.includes(query),
    removeEventListener: () => {},
  }));

/** `Element.animate` (absent in jsdom), counting the rolls started */
function stubAnimate() {
  const animate = vi.fn(() => ({
    cancel: () => {},
    finished: new Promise(() => {}),
  }));
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: animate,
  });
  return animate;
}

afterEach(() => {
  cleanup();
  copies.rendered = 0;
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
});

describe('CreditsRoll', () => {
  it('below lg with reduced motion, is still from its first render and never rolls', () => {
    media(REDUCED_MOTION);
    const animate = stubAnimate();
    render(<CreditsRoll blocks={BLOCKS} />);
    expect(screen.getAllByTestId('list')).toHaveLength(1);
    // not drawn doubled and collapsed after mount: never doubled at all
    expect(copies.rendered).toBe(0);
    expect(animate).not.toHaveBeenCalled();
  });

  it('from lg with reduced motion, never rolls and its box scrolls by hand', () => {
    media(WIDE_LG, REDUCED_MOTION);
    const animate = stubAnimate();
    render(<CreditsRoll blocks={BLOCKS} />);
    expect(screen.getAllByTestId('list')).toHaveLength(1);
    expect(copies.rendered).toBe(0);
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Credits' }).className).toContain(
      'lg:overflow-y-auto',
    );
  });

  it('from lg, rolls the doubled list without reduced motion', () => {
    media(WIDE_LG);
    const animate = stubAnimate();
    render(<CreditsRoll blocks={BLOCKS} />);
    expect(screen.getByTestId('copy')).toBeTruthy();
    expect(animate).toHaveBeenCalledTimes(1);
  });
});
