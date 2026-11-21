// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Row, { type RowSwap } from './Row';

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
  it('is a region named by its title', () => {
    const root = topPicks();
    const section = root.querySelector('section')!;
    const heading = root.querySelector('h2')!;
    expect(heading.textContent).toBe('Top Picks for November');
    expect(heading.id).not.toBe('');
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
});

describe('Row with a switch (swap)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        disconnect() {}
        observe() {}
      },
    );
  });

  const tiles = (names: ReadonlyArray<string>) =>
    names.map((name) => (
      <a href={`/${name}`} key={name}>
        {name}
      </a>
    ));
  const swapOf = (key: string, arriving: boolean): RowSwap => ({
    arriving,
    key,
    onTransitionEnd: vi.fn(),
  });

  it('draws no arrival without a swap', () => {
    const list = topPicks().querySelector('ul')!;
    expect(list.hasAttribute('data-fade')).toBe(false);
    expect(list.firstElementChild?.className).not.toContain('starting:');
  });

  it('never rises in on the first paint', () => {
    const swap = swapOf('crime', false);
    const root = serverRender(
      renderToStaticMarkup(
        <Row id="kinds" swap={swap} title="Crime">
          {tiles(['silo', 'severance'])}
        </Row>,
      ),
    );
    expect(root.querySelector('ul')!.hasAttribute('data-fade')).toBe(false);
  });

  it('draws a switched-to tab as new tiles that rise into the same rail', () => {
    const { container, rerender } = render(
      <Row id="kinds" swap={swapOf('crime', false)} title="Crime">
        {tiles(['silo', 'severance'])}
      </Row>,
    );
    const rail = container.querySelector('ul')!;
    const before = Array.from(rail.children);
    // the same show in both tabs is drawn again too: the whole tab arrives
    rerender(
      <Row id="kinds" swap={swapOf('drama', true)} title="Crime">
        {tiles(['silo', 'dark'])}
      </Row>,
    );
    expect(container.querySelector('ul')).toBe(rail);
    expect(container.querySelectorAll('#kinds-rail')).toHaveLength(1);
    expect(rail.hasAttribute('data-fade')).toBe(true);
    expect(rail.firstElementChild).not.toBe(before[0]);
  });

  it('keeps its tiles while the tab stays', () => {
    const { container, rerender } = render(
      <Row id="kinds" swap={swapOf('crime', true)} title="Crime">
        {tiles(['silo'])}
      </Row>,
    );
    const tile = container.querySelector('li');
    rerender(
      <Row id="kinds" swap={swapOf('crime', false)} title="Crime">
        {tiles(['silo'])}
      </Row>,
    );
    expect(container.querySelector('li')).toBe(tile);
    expect(container.querySelector('ul')!.hasAttribute('data-fade')).toBe(
      false,
    );
  });
});
