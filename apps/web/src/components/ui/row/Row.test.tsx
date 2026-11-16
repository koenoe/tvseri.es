// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Row from './Row';

function serverRender(markup: string) {
  const root = document.createElement('div');
  root.innerHTML = markup;
  return root;
}

const topPicks = () =>
  serverRender(
    renderToStaticMarkup(
      <Row id="top-picks" title="Top Picks for November">
        <a href="/1396/breaking-bad">Breaking Bad</a>
        <a href="/95396/severance">Severance</a>
        <a href="/125988/silo">Silo</a>
      </Row>,
    ),
  );

describe('Row (server markup)', () => {
  it('is a region named by its title-2 header', () => {
    const root = topPicks();
    const section = root.querySelector('section')!;
    const heading = root.querySelector('h2')!;
    expect(heading.textContent).toBe('Top Picks for November');
    expect(heading.className).toContain('text-title-2');
    expect(section.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('lists every tile in its own list item, in order', () => {
    const root = topPicks();
    const list = root.querySelector('ul')!;
    expect(list.getAttribute('role')).toBe('list');
    const items = Array.from(list.children);
    expect(items.map((item) => item.tagName)).toEqual(['LI', 'LI', 'LI']);
    expect(items.map((item) => item.textContent)).toEqual([
      'Breaking Bad',
      'Severance',
      'Silo',
    ]);
  });

  it('scrolls natively with snapping and no scroll bar', () => {
    const root = topPicks();
    const list = root.querySelector('ul')!;
    expect(list.classList).toContain('overflow-x-auto');
    expect(list.classList).toContain('scrollbar-none');
    expect(list.classList).toContain('snap-x');
    expect(list.classList).toContain('snap-mandatory');
    for (const item of list.children) {
      expect(item.classList).toContain('snap-start');
    }
  });

  it('renders no arrows on the server (they appear once the rail is measured)', () => {
    expect(topPicks().querySelectorAll('button')).toHaveLength(0);
  });

  it('adds the count, subtitle and See all link to the header when given', () => {
    const root = serverRender(
      renderToStaticMarkup(
        <Row
          count={42}
          id="watchlist"
          seeAllHref="/u/margaux/watchlist"
          subtitle="Shows you saved for later"
          title="Watchlist"
        >
          <a href="/1396">Breaking Bad</a>
        </Row>,
      ),
    );
    expect(root.textContent).toContain('42');
    expect(root.textContent).toContain('Shows you saved for later');
    const seeAll = root.querySelector('a[href="/u/margaux/watchlist"]')!;
    expect(seeAll.textContent).toBe('See all');
  });

  it('shows a switch beside the title and on its own phone line', () => {
    const root = serverRender(
      renderToStaticMarkup(
        <Row
          id="trending"
          switcher={<button type="button">Crime</button>}
          title="Trending in Crime"
        >
          <a href="/1396">Breaking Bad</a>
        </Row>,
      ),
    );
    expect(root.querySelectorAll('button')).toHaveLength(2);
  });

  it('takes a board’s look as tokens on its own wrapper, not a fork', () => {
    const root = serverRender(
      renderToStaticMarkup(
        <Row id="essentials" look="hubPoster" title="Essentials">
          <a href="/1396">Breaking Bad</a>
        </Row>,
      ),
    );
    const look = root.querySelector('[data-row-look="hubPoster"]')!;
    expect(look.className).toContain('[--tile-radius:10px]');
    expect(look.className).toContain('@max-[639px]:[--row-tile:132px]');
    expect(root.querySelector('[data-row-look]')).toBe(look);
  });
});
