// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SubpageHeader, { SUBPAGE_TITLE_ID } from './SubpageHeader';

describe('SubpageHeader', () => {
  it('names the page, with its count and description', () => {
    render(
      <SubpageHeader
        count="4,718 episodes"
        description="Everything you watched, by day, newest first."
        title="History"
      />,
    );
    const heading = screen.getByRole('heading', { level: 2, name: 'History' });
    expect(heading.id).toBe(SUBPAGE_TITLE_ID);
    expect(screen.getByText('4,718 episodes')).toBeTruthy();
    expect(
      screen.getByText('Everything you watched, by day, newest first.'),
    ).toBeTruthy();
  });

  it('leaves out what it is not given', () => {
    const { container } = render(<SubpageHeader title="Circle" />);
    expect(container.textContent).toBe('Circle');
  });
});
