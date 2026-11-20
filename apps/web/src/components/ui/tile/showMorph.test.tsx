// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { Activity } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  armShowMorph,
  claimShowMorph,
  settleShowMorph,
  useShowMorphTarget,
} from './showMorph';

/** A card that hands its art over: a slide of each show, the clicked link's own */
const card = () => {
  document.body.innerHTML = `
    <section data-show-morph-scope>
      <div data-show-morph="art" data-show-morph-id="1"></div>
      <div data-show-morph="art" data-show-morph-id="2"></div>
      <div data-show-morph-id="1"><span data-show-morph="logo"></span></div>
      <div data-show-morph-id="2"><span data-show-morph="logo"></span>
        <a href="/2/two">Two</a></div>
    </section>
    <a href="/2/two" id="elsewhere">Two again</a>`;
  return document.querySelector<HTMLAnchorElement>(
    'section a',
  ) as HTMLAnchorElement;
};

const click = (
  anchor: HTMLAnchorElement,
  extra: Partial<Pick<MouseEvent, 'defaultPrevented' | 'metaKey'>> = {},
) =>
  armShowMorph({
    altKey: false,
    button: 0,
    ctrlKey: false,
    currentTarget: anchor,
    defaultPrevented: false,
    metaKey: false,
    shiftKey: false,
    ...extra,
  });

const names = () =>
  [...document.querySelectorAll<HTMLElement>('[data-show-morph]')].map(
    (element) => element.style.viewTransitionName,
  );

const reduced = vi.fn(() => false);

/** The show page's side, for show 2 */
function MorphTarget() {
  useShowMorphTarget(2);
  return null;
}

describe('showMorph', () => {
  beforeEach(() => {
    reduced.mockReturnValue(false);
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce') ? reduced() : false,
    }));
    Object.assign(document, { startViewTransition: () => undefined });
    // on screen: jsdom draws nothing
    vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList);
    document.documentElement.removeAttribute('data-flat-glass');
  });
  afterEach(() => {
    settleShowMorph();
    vi.unstubAllGlobals();
  });

  it("names the clicked card's art and logo for the show it opens", () => {
    click(card());
    expect(names()).toEqual(['', 'show-art-2', '', 'show-logo-2']);
  });

  it('names nothing for a link outside a card that hands over', () => {
    card();
    click(document.getElementById('elsewhere') as HTMLAnchorElement);
    expect(names()).toEqual(['', '', '', '']);
  });

  it.each([
    ['a click that opens elsewhere', { metaKey: true }],
    ['a click something else handled', { defaultPrevented: true }],
  ])('names nothing for %s', (_, extra) => {
    click(card(), extra);
    expect(names()).toEqual(['', '', '', '']);
  });

  it('names nothing with reduced motion', () => {
    reduced.mockReturnValue(true);
    click(card());
    expect(names()).toEqual(['', '', '', '']);
  });

  it('names nothing on a slow device', () => {
    document.documentElement.setAttribute('data-flat-glass', '');
    click(card());
    expect(names()).toEqual(['', '', '', '']);
  });

  it('is claimed once by the show it opens, while the card is on screen', () => {
    click(card());
    expect(claimShowMorph(1)).toBe(false);
    expect(claimShowMorph(2)).toBe(true);
    // the page left (Activity hides it) before the show arrived: a skeleton
    // came first, so the show's late arrival must not morph
    vi.mocked(Element.prototype.getClientRects).mockReturnValue(
      [] as unknown as DOMRectList,
    );
    expect(claimShowMorph(2)).toBe(false);
  });

  it('settles: the names go once the show has taken over', () => {
    click(card());
    settleShowMorph();
    expect(names()).toEqual(['', '', '', '']);
    expect(claimShowMorph(2)).toBe(false);
  });

  it('a new click takes the hand-off over', () => {
    const anchor = card();
    click(anchor);
    const one = document.createElement('a');
    one.href = '/1/one';
    document.querySelector('[data-show-morph-id="1"]')?.append(one);
    click(one);
    expect(names()).toEqual(['show-art-1', '', 'show-logo-1', '']);
  });

  // Next keeps the last routes mounted in a hidden <Activity>: Back shows
  // the page again and re-runs its layout effects, its state kept
  it('opens the page at the top once, not again when Back shows it', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    click(card());
    const page = (mode: 'hidden' | 'visible') => (
      <Activity mode={mode}>
        <MorphTarget />
      </Activity>
    );
    const { rerender } = render(page('visible'));
    expect(scrollTo).toHaveBeenCalledOnce();
    rerender(page('hidden'));
    rerender(page('visible'));
    expect(scrollTo).toHaveBeenCalledOnce();
  });
});
