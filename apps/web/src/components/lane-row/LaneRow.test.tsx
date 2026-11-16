// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LaneRow from './LaneRow';
import LaneRowGhost from './LaneRowGhost';
import type { LaneRowLayout } from './laneRowLayout';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ prefetch: () => {} }),
}));

afterEach(cleanup);

const SEASON: LaneRowLayout = {
  code: 'lane',
  count: 'count-wide',
  countInMeta: 'count-phone',
  meta: 'meta',
  metaFit: 'drop',
  row: 'row',
  text: 'text',
  title: 'title',
  titleLine: 'title-line',
};

const PLAIN: LaneRowLayout = {
  code: 'meta',
  meta: 'meta',
  row: 'row',
  text: 'text',
  textAs: 'span',
  title: 'title',
};

const progress = { label: '5 of 6 episodes watched', segments: [true, false] };
const poster = <span data-testid="poster" />;
const eye = <button type="button">Eye</button>;

describe('LaneRow', () => {
  it('links the poster and the title to the show when it has a page', () => {
    render(
      <LaneRow
        code="S02E06"
        count="1 to go"
        end={eye}
        href="/tv/1/black-doves"
        layout={SEASON}
        poster={poster}
        progress={progress}
        title="Black Doves"
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/tv/1/black-doves',
      '/tv/1/black-doves',
    ]);
    expect(links[0]).toHaveProperty('tabIndex', -1);
    expect(links[1]?.className).toContain('title');
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      '5 of 6 episodes watched',
    );
  });

  it('is no link without a page: the title is plain text', () => {
    const { container } = render(
      <LaneRow
        code="S02E06"
        count="1 to go"
        end={eye}
        layout={SEASON}
        poster={poster}
        title="Black Doves"
      />,
    );
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(container.querySelector('b.title')?.textContent).toBe('Black Doves');
  });

  it('draws the count beside the title and again in the meta line where the layout says', () => {
    const { container } = render(
      <LaneRow
        code="S02E06"
        count="1 to go"
        end={eye}
        layout={SEASON}
        poster={poster}
        title="Black Doves"
      />,
    );
    const line = container.querySelector('.title-line');
    expect(line?.querySelector('.count-wide')?.textContent).toBe('1 to go');
    const meta = container.querySelector('.meta');
    expect(meta?.firstElementChild?.textContent).toBe('S02E06');
    expect(meta?.querySelector('.count-phone')?.textContent).toBe('1 to go');
  });

  it('without a title line the title stands alone, with no segments or count', () => {
    const { container } = render(
      <LaneRow
        as="li"
        code="S04E02"
        end={eye}
        footnote={<p>Season complete</p>}
        layout={PLAIN}
        poster={poster}
        title="The Gilded Age"
      />,
    );
    const text = container.querySelector('li.row > span.text');
    expect(text?.firstElementChild?.tagName).toBe('B');
    expect(container.querySelector('[role="img"]')).toBeNull();
    expect(text?.lastElementChild?.textContent).toBe('Season complete');
  });
});

describe('LaneRowGhost', () => {
  it('draws the row in the loaded row boxes, with eight empty segments when asked', () => {
    const { container } = render(
      <LaneRowGhost
        end={<span />}
        facts={<span />}
        ghost={{ row: 'ghost-row', segment: 'segment' }}
        layout={SEASON}
        poster={<span />}
        title={<span />}
      />,
    );
    expect(
      container.querySelector('.ghost-row > .text > .title-line'),
    ).not.toBeNull();
    expect(container.querySelectorAll('i.segment')).toHaveLength(8);
    expect(container.querySelector('.meta')).not.toBeNull();
  });
});
