// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';

import type { MapPlace } from './types';
import WhereSetExplorer from './WhereSetExplorer';

const LABEL = { phone: 'right-up', wide: 'right-up' } as const;
const ROOMY = { phone: true, wide: true } as const;

const PLACES: ReadonlyArray<MapPlace> = [
  {
    label: LABEL,
    left: '10%',
    name: 'Oslo',
    roomy: ROOMY,
    shows: [{ href: '/tv/1', image: 0, title: 'Norsemen' }],
    slug: 'oslo',
    top: '10%',
  },
  {
    label: LABEL,
    left: '50%',
    name: 'Tokyo',
    roomy: ROOMY,
    shows: [
      { href: '/tv/2', image: 1, title: 'Tokyo Vice' },
      { href: '/tv/3', image: 2, title: 'Giri/Haji' },
    ],
    slug: 'tokyo',
    top: '40%',
  },
];

const NODES = [0, 1, 2].map((n) => <i key={n}>{`image ${n}`}</i>);

afterEach(cleanup);

const renderExplorer = () =>
  render(
    <WhereSetExplorer
      images={NODES}
      map={null}
      metas={NODES}
      places={PLACES}
      start={0}
      titles={NODES}
    />,
  );

const pin = (name: string) => screen.getByRole('button', { name });

describe('WhereSetExplorer', () => {
  it('a pin picks its place and its first show', () => {
    renderExplorer();
    expect(pin('Oslo: Norsemen').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(pin('Tokyo: Tokyo Vice'));

    expect(pin('Tokyo: Tokyo Vice').getAttribute('aria-pressed')).toBe('true');
    expect(pin('Oslo: Norsemen').getAttribute('aria-pressed')).toBe('false');
    expect(
      screen
        .getByRole('link', { name: 'Open Tokyo Vice' })
        .getAttribute('href'),
    ).toBe('/tv/2');
  });

  it('"More set in" steps through the place’s shows, wrapping around', () => {
    renderExplorer();
    expect(screen.queryByRole('button', { name: 'More set in Oslo' })).toBe(
      null,
    );
    fireEvent.click(pin('Tokyo: Tokyo Vice'));

    const more = screen.getByRole('button', { name: 'More set in Tokyo' });
    fireEvent.click(more);
    expect(screen.getByRole('link', { name: 'Open Giri/Haji' })).toBeTruthy();
    fireEvent.click(more);
    expect(screen.getByRole('link', { name: 'Open Tokyo Vice' })).toBeTruthy();
  });

  it('the old show’s facts fade out of reach while the new show’s arrive', () => {
    const facts = [0, 1, 2].map((n) => <i key={n}>{`facts ${n}`}</i>);
    render(
      <MotionProvider>
        <WhereSetExplorer
          images={NODES}
          map={null}
          metas={facts}
          places={PLACES}
          start={0}
          titles={NODES}
        />
      </MotionProvider>,
    );
    expect(screen.getByText('facts 0').closest('[inert]')).toBe(null);

    fireEvent.click(pin('Tokyo: Tokyo Vice'));

    expect(screen.getByText('facts 0').closest('[inert]')).not.toBe(null);
    expect(screen.getByText('facts 1').closest('[inert]')).toBe(null);
  });
});
