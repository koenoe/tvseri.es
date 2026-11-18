// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { END_LINE } from './endLines';
import LandingEndCard from './LandingEndCard';
import LandingShowRow from './LandingShowRow';

// TileLink prefetches on intent through the app router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: () => {} }),
}));

vi.mock('@/components/ui/tile/WatchedOverlay', () => ({
  default: () => null,
}));
vi.mock('./SeenNote', () => ({ default: () => null }));

describe('copy that the design writes per breakpoint', () => {
  it('the end card’s title reads differently on a phone, its line is the same', () => {
    render(
      <LandingEndCard
        line={END_LINE.country}
        phoneTitle="That’s the United Kingdom"
        title="That’s United Kingdom"
      />,
    );
    expect(screen.getByText('Try another country next.')).toBeTruthy();
    expect(screen.getByText('That’s the United Kingdom').className).toContain(
      'md:hidden',
    );
  });

  it('a row title can read differently on a phone (“New from the UK”)', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        disconnect() {}
        observe() {}
        unobserve() {}
      },
    );
    render(
      <LandingShowRow
        id="country-new"
        phoneTitle="New from the UK"
        plan={{
          drops: {},
          kind: 'shows',
          limit: 20,
          shows: [1, 2, 3].map((id) => ({
            id,
            poster: null,
            slug: `show-${id}`,
            title: `Show ${id}`,
          })),
        }}
        title="New from United Kingdom"
      />,
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('New from United Kingdom');
    expect(screen.getByText('New from the UK').className).toContain(
      'md:hidden',
    );
  });

  it('a row left with two shows after the rows above steps aside', () => {
    const { container } = render(
      <LandingShowRow
        id="country-new"
        plan={{
          drops: {},
          kind: 'shows',
          limit: 20,
          shows: [1, 2].map((id) => ({
            id,
            poster: null,
            slug: `show-${id}`,
            title: `Show ${id}`,
          })),
        }}
        title="New from United Kingdom"
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});
