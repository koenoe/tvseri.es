// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PathSwitcher from './PathSwitcher';

const TITLES = [
  'Silo to Dark, in 2 steps',
  'Silo to Devs, in 2 steps',
  'Silo to Lost, in 2 steps',
];
const CHAINS = ['chain to Dark', 'chain to Devs', 'chain to Lost'];

const renderSwitcher = (count = TITLES.length) =>
  render(
    <PathSwitcher
      chains={CHAINS.slice(0, count)}
      label={<h2>Connected by</h2>}
      titles={TITLES.slice(0, count)}
    />,
  );

const another = () => screen.getByRole('button', { name: 'Another path' });

describe('Connected by: the path switcher', () => {
  it('shows the first path, with Another path as the head’s only action', () => {
    renderSwitcher();

    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(
      'Silo to Dark, in 2 steps',
    );
    expect(screen.getByText('chain to Dark')).toBeTruthy();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Another path',
    ]);
  });

  it('steps through the paths and wraps around to the first', () => {
    renderSwitcher();

    const seen: Array<string | null> = [];
    for (let step = 0; step < 4; step++) {
      seen.push(screen.getByRole('heading', { level: 3 }).textContent);
      fireEvent.click(another());
    }

    expect(seen).toEqual([...TITLES, TITLES[0]]);
    expect(screen.getByText('chain to Devs')).toBeTruthy();
    expect(screen.queryByText('chain to Dark')).toBeNull();
  });

  it('announces a new path’s title, not the first one read with the page', () => {
    const { container } = renderSwitcher();
    const live = container.querySelector('[aria-live="polite"]');

    expect(live?.textContent).toBe('');
    fireEvent.click(another());
    expect(live?.textContent).toBe('Silo to Devs, in 2 steps');
  });

  it('leaves Another path out when the day has one path', () => {
    renderSwitcher(1);

    expect(screen.getByText('chain to Dark')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
