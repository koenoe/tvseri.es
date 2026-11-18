// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import type { TvSeries } from '@tvseri.es/schemas';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { closeTrayRequest, requestTray } from '../admin/adminStore';
import Hero from './Hero';

vi.mock('../actions/ActionsHole', () => ({
  default: () => <div data-testid="actions-hole" />,
}));
vi.mock('../first-tracking/FirstTrackingPrompt', () => ({
  default: () => <div data-testid="prompt" />,
}));
vi.mock('../progress/ProgressHole', () => ({ default: () => null }));
vi.mock('../where-to-watch/RatingAndProvider', () => ({
  default: () => null,
  RatingAndProviderSkeleton: () => null,
}));
vi.mock('./ImdbRating', () => ({
  default: () => null,
  ImdbRatingSkeleton: () => null,
}));
vi.mock('./PhoneBackdrop', () => ({ default: () => null }));
vi.mock('./HeroTitle', () => ({ default: () => null }));
vi.mock('./HeroMeta', () => ({ default: () => null }));

const series = {
  description: 'A show.',
  externalIds: {},
  hasAired: true,
  id: 1,
  title: 'Show',
} as unknown as TvSeries;

beforeEach(() => {
  // jsdom has none; the synopsis' clamp watches its width with one
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
    },
  );
});

describe('Hero', () => {
  it('renders the actions and the first-tracking prompt once each (one tree, placed by CSS)', () => {
    render(<Hero series={series} />);
    expect(screen.getAllByTestId('actions-hole')).toHaveLength(1);
    expect(screen.getAllByTestId('prompt')).toHaveLength(1);
  });

  it('asks nothing before the premiere', () => {
    render(<Hero series={{ ...series, hasAired: false }} />);
    expect(screen.queryByTestId('prompt')).toBeNull();
  });

  it('draws the synopsis clamped to three lines in its grid cell, which docking hides', () => {
    render(<Hero series={series} />);
    const text = screen.getByText('A show.');
    expect(text.className).toContain('line-clamp-3');
    expect(text.parentElement?.className).toContain(
      'md:group-data-docked/hero:hidden',
    );
  });

  it('docks while the admin tray is open for this show (data-docked drives the CSS) and undocks on close', () => {
    const { container } = render(<Hero series={series} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.hasAttribute('data-docked')).toBe(false);
    act(() => requestTray(1));
    expect(grid.hasAttribute('data-docked')).toBe(true);
    act(() => closeTrayRequest());
    expect(grid.hasAttribute('data-docked')).toBe(false);
    act(() => requestTray(2));
    expect(grid.hasAttribute('data-docked')).toBe(false);
    act(() => closeTrayRequest());
  });
});
