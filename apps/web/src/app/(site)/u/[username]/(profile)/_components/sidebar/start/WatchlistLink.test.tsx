// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import WatchlistLink from './WatchlistLink';

afterEach(cleanup);

describe('WatchlistLink', () => {
  it('opens the owner’s watchlist shelf, its count in the name only', () => {
    render(<WatchlistLink count={1234} username="alex" />);
    const link = screen.getByRole('link', {
      name: 'Watchlist, 1,234 series',
    });
    expect(link.getAttribute('href')).toBe('/u/alex/library/watchlist');
    expect(link.textContent).toBe('Watchlist');
  });

  it('is no link while the watchlist is empty', () => {
    render(<WatchlistLink count={0} username="alex" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Watchlist')).toBeTruthy();
  });
});
