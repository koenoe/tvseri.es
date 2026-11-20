// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import CalendarEmpty from './CalendarEmpty';

afterEach(cleanup);

describe('an empty calendar', () => {
  it('speaks to the owner', () => {
    render(<CalendarEmpty owner username="alex" />);

    expect(
      screen.getByText(/When a show you watch, save or finish/),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Your library' })).toBeTruthy();
  });

  it('names the owner to a visitor, never “you”', () => {
    const { container } = render(
      <CalendarEmpty owner={false} username="juno" />,
    );

    expect(
      screen.getByText(/When a show juno watches, saves or finishes/),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'juno’s library' }).getAttribute('href'),
    ).toBe('/u/juno/library');
    expect(container.textContent).not.toMatch(/\byour?\b/i);
  });
});
